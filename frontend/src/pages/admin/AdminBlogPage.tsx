import React from 'react';
import { ContentManager } from './AdminNoticePage';

/** Blog / guide posts. Shares the content workflow UI with notices (kind = 'blog'). */
export const AdminBlogPage: React.FC = () => <ContentManager kind="blog" />;
