import React, { useState, useRef } from "react";
import {
  Folder,
  FileCode,
  Plus,
  FolderPlus,
  Upload,
  MoreVertical,
  ChevronRight,
  Save,
  X,
  Edit3,
  Trash2,
  FilePlus,
  FileText
} from "lucide-react";
import { BotFile } from "../types";

// ---------- Folder-path helpers (files live in a flat array with a `path` field) ----------

/** Storage key that uniquely identifies a file: its folder path + name. */
const fileKey = (f: BotFile) => `${f.path || ""}/${f.name}`;

/** Folder prefix for a file's location ("" for root). */
const fileDir = (f: BotFile) => f.path || "";

/** True when a file sits directly inside the given directory. */
const inDirectory = (f: BotFile, dir: string) => fileDir(f) === dir;

const TEXT_EXTENSIONS = [".js", ".ts", ".json", ".txt", ".md", ".py", ".html", ".css", ".yml", ".yaml", ".env", ".xml", ".sh", ".php", ".rb", ".go", ".env.example"];

const isTextFile = (name: string, type: string) => {
  if (type.startsWith("text/")) return true;
  if (type === "application/json" || type === "" || type === "text/plain") return true;
  const lower = name.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext)) || lower === ".env" || lower.startsWith(".env.");
};

interface FilesTabProps {
  files: BotFile[];
  /** Scoped updater for the active container's files (function-updater style). */
  setFiles: (updater: (files: BotFile[]) => BotFile[]) => void;
  /** Called after any file mutation; `packageJsonChanged` invalidates installed deps. */
  onFileChange: (packageJsonChanged?: boolean) => void;
}

export default function FilesTab({ files, setFiles, onFileChange }: FilesTabProps) {
  const [currentPath, setCurrentPath] = useState<string[]>(["home", "container"]);
  const [editingFile, setEditingFile] = useState<BotFile | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [showCreateModal, setShowCreateModal] = useState<"file" | "folder" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current directory as a relative path ("" = root of /home/container)
  const currentDir = currentPath.slice(2).join("/");

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const processUploadedFiles = (fileList: FileList) => {
    Array.from(fileList).forEach((file) => {
      if (!isTextFile(file.name, file.type)) {
        alert(`'${file.name}' is not a text file and cannot be uploaded to the container.`);
        return;
      }
      if (file.size > 1024 * 1024) {
        alert(`'${file.name}' exceeds the 1 MB upload limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const textContent = (e.target?.result as string) || "";
        const sizeFormatted = formatBytes(file.size);
        const dir = currentDir;

        setFiles((prev) => {
          // Overwrite existing file with same name in the same folder
          const updated = prev.filter((f) => !(f.name.toLowerCase() === file.name.toLowerCase() && fileDir(f) === dir));
          const newBotFile: BotFile = {
            name: file.name,
            path: dir,
            isFolder: false,
            size: sizeFormatted,
            updatedAt: "Just Now",
            content: textContent
          };
          return [...updated, newBotFile];
        });
        // Only package.json edits invalidate installed node_modules;
        // every file change clears the crash banner so the scanner re-evaluates.
        onFileChange(file.name.toLowerCase() === "package.json");
      };
      reader.readAsText(file);
    });
  };

  const handleFileChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  // Only show entries that live in the current directory
  const visibleFiles = files.filter((f) => inDirectory(f, currentDir));
  const isAtRoot = currentPath.length === 2;

  const handleFolderClick = (folderName: string) => {
    setCurrentPath([...currentPath, folderName]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setCurrentPath(currentPath.slice(0, index + 1));
  };

  const openEditor = (file: BotFile) => {
    setEditingFile(file);
    setEditorContent(file.content);
    setActiveDropdown(null);
  };

  const saveEditor = () => {
    if (!editingFile) return;      const key = fileKey(editingFile);
    setFiles((prev) =>
      prev.map((f) =>
        fileKey(f) === key
          ? {
              ...f,
              content: editorContent,
              size: formatBytes(new Blob([editorContent]).size),
              updatedAt: "Just Now"
            }
          : f
      )
    );
    setEditingFile(null);
    onFileChange(editingFile.name.toLowerCase() === "package.json"); // notify parent of file changes
  };

  const deleteItem = (name: string) => {
    const target = files.find((f) => f.name === name && fileDir(f) === currentDir);
    if (!target) return;
    const label = target.isFolder ? `folder '${name}' and ALL of its contents` : `file '${name}'`;
    if (!window.confirm(`Are you sure you want to permanently delete the ${label}?`)) {
      setActiveDropdown(null);
      return;
    }
    if (target.isFolder) {
      // Deleting a folder also removes EVERYTHING inside it (any nesting depth):
      // keep entries that are not the folder itself and not located under it.
      const folderPrefix = `${currentDir ? currentDir + "/" : ""}${name}/`;
      setFiles((prev) => prev.filter((f) => {
        const dir = fileDir(f);
        if (dir === currentDir && f.name === name) return false; // the folder itself
        return !dir.startsWith(folderPrefix); // anything nested inside it
      }));
    } else {
      const key = fileKey(target);
      setFiles((prev) => prev.filter((f) => fileKey(f) !== key));
    }
    setActiveDropdown(null);
    onFileChange();
  };

  const createItem = () => {
    if (!newItemName.trim()) return;
    const isFolder = showCreateModal === "folder";
    const dir = currentDir;
    const exists = files.some((f) => f.name.toLowerCase() === newItemName.trim().toLowerCase() && fileDir(f) === dir);
    
    if (exists) {
      alert("An item with this name already exists in this folder!");
      return;
    }

    const newItem: BotFile = {
      name: newItemName.trim(),
      path: dir,
      isFolder,
      size: isFolder ? "--" : "0 B",
      updatedAt: "Just Now",
      content: isFolder ? "" : `// New file ${newItemName.trim()}\n`
    };

    setFiles((prev) => [...prev, newItem]);
    setShowCreateModal(null);
    setNewItemName("");
    onFileChange(false);
  };

  const toggleDropdown = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  return (
    <div id="files-tab-viewport" className="space-y-4">
      
      {/* 1. Breadcrumbs Navigation & Creation Panel */}
      <div id="file-actions-bar" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[#0e0a1b]/60 border border-purple-500/10 p-4 rounded-xl backdrop-blur-md">
        
        {/* Breadcrumb Path representation */}
        <div id="file-breadcrumbs" className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono py-1">
          {currentPath.map((folder, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight size={12} className="text-purple-700/60 shrink-0" />}
              <button
                id={`breadcrumb-layer-${index}`}
                onClick={() => handleBreadcrumbClick(index)}
                className={`uppercase tracking-widest font-black transition-colors shrink-0 hover:text-purple-400 ${
                  index === currentPath.length - 1 ? "text-purple-400" : "text-gray-500"
                }`}
              >
                / {folder}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Action button menu list */}
        <div id="file-action-buttons" className="flex items-center gap-2 self-end sm:self-auto">
          <button
            id="create-file-btn"
            onClick={() => setShowCreateModal("file")}
            className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-950/20 px-3 py-2 text-xs font-black uppercase text-purple-300 hover:bg-purple-950/50 hover:text-white transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Create File
          </button>
          <button
            id="create-folder-btn"
            onClick={() => setShowCreateModal("folder")}
            className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-950/20 px-3 py-2 text-xs font-black uppercase text-purple-300 hover:bg-purple-950/50 hover:text-white transition-colors cursor-pointer"
          >
            <FolderPlus size={14} />
            Create Folder
          </button>
          <button
            id="upload-file-btn"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-black uppercase text-white shadow-[0_2px_8px_rgba(168,85,247,0.2)] hover:bg-purple-500 transition-colors cursor-pointer"
          >
            <Upload size={14} />
            Upload
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={handleFileChangeInput}
          />
        </div>
      </div>

      {/* 2. Directory Listing Table */}
      <div 
        id="directory-listing-card" 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-2xl border transition-all duration-300 bg-[#0c0817]/80 backdrop-blur-md overflow-hidden relative ${
          isDragging 
            ? "border-purple-500 bg-purple-950/10 scale-[1.01] shadow-[0_0_20px_rgba(168,85,247,0.2)]" 
            : "border-purple-500/10"
        }`}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-purple-950/40 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-30 pointer-events-none animate-pulse">
            <Upload className="text-purple-400 animate-bounce" size={32} />
            <span className="text-sm font-black uppercase tracking-widest text-purple-300">
              Drop files here to upload
            </span>
          </div>
        )}
        <div id="file-table-header" className="grid grid-cols-12 border-b border-purple-500/10 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-950/15">
          <div className="col-span-8 flex items-center gap-2">Name</div>
          <div className="col-span-2 text-right hidden sm:block">Size</div>
          <div className="col-span-2 text-right hidden sm:block">Last Modified</div>
          <div className="col-span-4 sm:col-span-2 text-right">Actions</div>
        </div>

        <div id="file-table-body" className="divide-y divide-purple-500/5">
          {/* Back to Parent Directory (simulated) */}
          {!isAtRoot && (
            <div
              id="file-back-button"
              onClick={() => setCurrentPath(currentPath.slice(0, -1))}
              className="grid grid-cols-12 items-center px-6 py-4 text-xs font-semibold text-purple-400 hover:bg-purple-950/15 cursor-pointer transition-colors"
            >
              <div className="col-span-12 flex items-center gap-3">
                <Folder className="text-purple-600 fill-purple-950/30" size={18} />
                <span>.. / (Go Back)</span>
              </div>
            </div>
          )}

          {/* Map current files (only entries inside the active directory) */}
          {visibleFiles.map((file) => (
            <div
              key={fileKey(file)}
              id={`file-row-${fileKey(file).replace(/[^a-zA-Z0-9]/g, "-")}`}
              className="grid grid-cols-12 items-center px-6 py-3.5 hover:bg-purple-950/10 transition-colors select-none"
            >
              {/* Name & Type Column */}
              <div
                className="col-span-8 flex items-center gap-3 font-mono text-sm font-semibold text-gray-200 cursor-pointer hover:text-purple-400 truncate"
                onClick={() => {
                  if (file.isFolder) {
                    handleFolderClick(file.name);
                  } else {
                    openEditor(file);
                  }
                }}
              >
                {file.isFolder ? (
                  <Folder className="text-purple-500 fill-purple-950/40 shrink-0" size={18} />
                ) : file.name.endsWith(".json") ? (
                  <FileCode className="text-pink-500 shrink-0" size={18} />
                ) : file.name.endsWith(".js") ? (
                  <FileCode className="text-emerald-400 shrink-0" size={18} />
                ) : (
                  <FileText className="text-purple-400 shrink-0" size={18} />
                )}
                <span className="truncate">{file.name}</span>
              </div>

              {/* Size Column */}
              <div className="col-span-2 text-right text-xs font-mono text-gray-500 hidden sm:block">
                {file.size}
              </div>

              {/* Modified Column */}
              <div className="col-span-2 text-right text-xs font-mono text-gray-500 hidden sm:block">
                {file.updatedAt}
              </div>

              {/* Interactive dropdown trigger */}
              <div className="col-span-4 sm:col-span-2 text-right relative">
                <button
                  id={`file-actions-toggle-${fileKey(file).replace(/[^a-zA-Z0-9]/g, "-")}`}
                  aria-label={`Actions for ${file.name}`}
                  onClick={(e) => toggleDropdown(e, fileKey(file))}
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-purple-950/40 hover:text-purple-400 transition-colors"
                >
                  <MoreVertical size={16} />
                </button>

                {activeDropdown === fileKey(file) && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                    <div id={`dropdown-menu-${file.name}`} className="absolute right-0 mt-1 w-36 rounded-lg border border-purple-500/10 bg-[#0e091d] p-1.5 text-left shadow-xl z-20">
                      {!file.isFolder && (
                        <button
                          id={`dropdown-opt-edit-${file.name}`}
                          onClick={() => openEditor(file)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-bold text-gray-300 hover:bg-purple-950/40 hover:text-purple-400"
                        >
                          <Edit3 size={14} />
                          Edit Code
                        </button>
                      )}
                      <button
                        id={`dropdown-opt-delete-${file.name}`}
                        onClick={() => deleteItem(file.name)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-950/20"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          {visibleFiles.length === 0 && (
            <div className="py-12 text-center text-sm font-bold text-purple-400/50">
              No files or folders in this directory.
            </div>
          )}
        </div>
      </div>

      {/* 3. Creation Modal */}
      {showCreateModal && (
        <div id="creation-dialog" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-purple-500/10 bg-[#0c0817] p-6 shadow-2xl space-y-4">
            <h3 className="text-md font-black uppercase tracking-wider text-white flex items-center gap-2">
              <FilePlus size={18} className="text-purple-400" />
              Create {showCreateModal === "file" ? "New File" : "New Folder"}
            </h3>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-purple-400">Name</label>
              <input
                id="create-item-name-input"
                type="text"
                placeholder={showCreateModal === "file" ? "e.g. index.js" : "e.g. plugins"}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full rounded-lg border border-purple-500/10 bg-[#060409] px-3 py-2 text-sm text-white font-mono outline-none focus:border-purple-500/40"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                id="create-modal-cancel"
                onClick={() => {
                  setShowCreateModal(null);
                  setNewItemName("");
                }}
                className="rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-400 hover:bg-purple-950/20"
              >
                Cancel
              </button>
              <button
                id="create-modal-submit"
                onClick={createItem}
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-purple-500 shadow-[0_2px_10px_rgba(168,85,247,0.3)]"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Monaco-style Editor Modal */}
      {editingFile && (
        <div id="inline-editor-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-4xl h-[80vh] flex flex-col rounded-2xl border border-purple-500/10 bg-[#090611] shadow-2xl overflow-hidden">
            
            {/* Editor Header */}
            <div className="flex items-center justify-between border-b border-purple-500/10 bg-[#0c0817] px-6 py-4">
              <div className="flex items-center gap-2">
                <FileCode size={18} className="text-purple-400" />
                <div>
                  <h4 className="text-sm font-black text-white font-mono">
                    {fileDir(editingFile) ? `${fileDir(editingFile)}/` : ""}{editingFile.name}
                  </h4>
                  <span className="text-[9px] uppercase tracking-widest text-purple-400/60 font-bold">
                    Editing file in real-time container
                  </span>
                </div>
              </div>
              <button
                id="editor-close-btn"
                onClick={() => setEditingFile(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-purple-950/40 hover:text-purple-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Code Field Content */}
            <div className="flex-1 p-4 bg-[#050308]">
              <textarea
                id="editor-text-area"
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="w-full h-full bg-transparent text-gray-200 font-mono text-[13px] leading-relaxed outline-none resize-none border-0 select-text p-2 scrollbar-thin scrollbar-thumb-purple-900 scrollbar-track-transparent"
                style={{ tabSize: 2 }}
                spellCheck={false}
              />
            </div>

            {/* Editor Footer controls */}
            <div className="flex items-center justify-between border-t border-purple-500/10 bg-[#0c0817] px-6 py-4">
              <span className="text-[10px] font-bold text-rose-400 max-w-md hidden sm:inline">
                * Tip: Modify index.js or config.json with a typo to test AI Diagnostic logs!
              </span>
              <div className="flex gap-2 ml-auto">
                <button
                  id="editor-cancel-btn"
                  onClick={() => setEditingFile(null)}
                  className="rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-400 hover:bg-purple-950/20"
                >
                  Cancel
                </button>
                <button
                  id="editor-save-btn"
                  onClick={saveEditor}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-emerald-500 shadow-[0_2px_10px_rgba(16,185,129,0.25)]"
                >
                  <Save size={14} />
                  Save Content
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
