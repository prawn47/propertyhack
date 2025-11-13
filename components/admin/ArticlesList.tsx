import React from 'react';

interface ArticlesListProps {
  onEditArticle: (article: any) => void;
  onCreateNew: () => void;
  refreshTrigger: number;
}

const ArticlesList: React.FC<ArticlesListProps> = ({ onEditArticle, onCreateNew, refreshTrigger }) => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Articles</h1>
      <p className="text-gray-600">Article management coming soon...</p>
    </div>
  );
};

export default ArticlesList;
