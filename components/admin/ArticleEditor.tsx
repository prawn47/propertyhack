import React from 'react';

interface ArticleEditorProps {
  article: any;
  onClose: () => void;
  onSaved: () => void;
}

const ArticleEditor: React.FC<ArticleEditorProps> = ({ article, onClose, onSaved }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-4">Article Editor</h2>
        <p className="text-gray-600 mb-4">Article editor coming soon...</p>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ArticleEditor;
