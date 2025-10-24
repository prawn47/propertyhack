import React from 'react';
import type { PublishedPost, DraftPost } from '../types';
import PostIcon from './icons/PostIcon';

interface DashboardSectionProps {
  title: string;
  posts: (PublishedPost | DraftPost)[];
  onSelectPost?: (post: DraftPost) => void;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({ title, posts, onSelectPost }) => {
  return (
    <div className="bg-base-100 p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4 text-content">{title}</h2>
      {posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map(post => {
            const isDraft = !('publishedAt' in post);
            const canSelect = onSelectPost && isDraft;

            const postContent = (
              <>
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt="Post visual" className="w-24 h-24 sm:w-32 sm:h-20 object-cover rounded-md flex-shrink-0" />
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-20 bg-base-200 rounded-md flex-shrink-0 flex items-center justify-center">
                      <PostIcon className="w-8 h-8 text-content-secondary" />
                  </div>
                )}
                <div className="flex-grow min-w-0">
                  <p className="font-semibold text-content line-clamp-2">{post.title}</p>
                  <p className="text-sm text-content-secondary line-clamp-2 mt-1">{post.text}</p>
                   {'publishedAt' in post && (
                       <p className="text-xs text-content-secondary mt-1">{(post as PublishedPost).publishedAt}</p>
                   )}
                </div>
              </>
            );
            
            if (canSelect) {
              return (
                <button
                  key={post.id}
                  onClick={() => onSelectPost(post as DraftPost)}
                  className="w-full flex items-start space-x-4 p-4 border border-base-300 rounded-lg text-left hover:bg-base-200 hover:border-brand-primary transition-all duration-200"
                >
                  {postContent}
                </button>
              );
            }

            return (
              <div key={post.id} className="flex items-start space-x-4 p-4 border border-base-300 rounded-lg">
                {postContent}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-content-secondary">No posts to display yet.</p>
      )}
    </div>
  );
};

export default DashboardSection;