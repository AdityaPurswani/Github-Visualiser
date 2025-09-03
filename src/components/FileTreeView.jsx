import React, { useState } from 'react';
import { Icons } from './Icon.jsx';

const FileTreeView = ({ files, onFileClick }) => {
    const createTree = (fileList) => {
        const tree = {};
        if (!fileList) return tree;
        fileList.forEach(file => {
            file.path.split('/').reduce((acc, part, index, arr) => {
                if (!acc[part]) acc[part] = { _files: {} };
                if (index === arr.length - 1) acc[part]._meta = file;
                return acc[part]._files;
            }, tree);
        });
        return tree;
    };

    const TreeItem = ({ name, item }) => {
        const [isOpen, setIsOpen] = useState(false);
        const isDir = Object.keys(item._files).length > 0;

        if (isDir) {
            return (
                <li className={`tree-item ${isOpen ? 'open' : ''}`}>
                    <div className="tree-item-content flex items-center p-1 rounded-md cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                        <span className={isOpen ? 'rotate-90' : ''}>{Icons.ChevronRight}</span>
                        {Icons.Folder}
                        <span>{name}</span>
                    </div>
                    <div className="tree-content">
                        <FileTree node={item._files} />
                    </div>
                </li>
            );
        }
        return (
            <li className="tree-item" data-type="blob">
                <button onClick={() => onFileClick(item._meta)} className="flex items-center p-1 ml-6 w-full text-left rounded-md hover:bg-gray-700">
                    {Icons.File}
                    <span className="truncate">{name}</span>
                </button>
            </li>
        );
    };

    const FileTree = ({ node }) => {
        const sortedKeys = Object.keys(node).sort((a, b) => {
            const aIsDir = Object.keys(node[a]._files).length > 0;
            const bIsDir = Object.keys(node[b]._files).length > 0;
            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.localeCompare(b);
        });
        return (
            <ul className="pl-4">
                {sortedKeys.map(key => <TreeItem key={key} name={key} item={node[key]} />)}
            </ul>
        );
    };

    if (!files || files.length === 0) {
        return <p className="text-gray-400">No files found in the main branch.</p>;
    }

    return <FileTree node={createTree(files)} />;
};

export default FileTreeView;