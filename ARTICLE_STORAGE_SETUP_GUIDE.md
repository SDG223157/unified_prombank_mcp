# Article Storage Feature Setup Guide

## Overview
The Article Storage feature allows users to save AI-generated content from Cursor directly into the Prompt Bank app. Users can create, view, edit, delete, and organize articles with sorting and filtering capabilities.

## 🚀 Quick Setup

### 1. Database Migration
First, run the database migration to create the articles table:

```bash
# Navigate to backend directory
cd backend

# Run the migration
curl -X POST http://localhost:3000/api/migrate-articles/add-articles-table \
  -H "Content-Type: application/json"
```

Or if your app is deployed:
```bash
curl -X POST https://your-domain.com/api/migrate-articles/add-articles-table \
  -H "Content-Type: application/json"
```

### 2. Restart the Application
After running the migration, restart your application to ensure all changes are loaded:

```bash
# If using Docker/Coolify
docker-compose restart

# If running locally
npm restart
```

## 📖 Usage in Cursor

### Available MCP Functions

The article management functions are available through the MCP server in Cursor:

#### 1. **create_article** - Save AI-generated content
```typescript
// Example usage in Cursor
create_article({
  title: "My Analysis Article",
  content: "# Analysis Results\n\nThis is the markdown content...",
  category: "Analysis",
  tags: ["ai-generated", "analysis"],
  promptId: "optional-source-prompt-id",
  metadata: {
    aiModel: "claude-3",
    generatedAt: "2025-01-19T10:30:00Z"
  }
})
```

#### 2. **get_article_list** - View your articles
```typescript
// List all articles
get_article_list()

// List with filtering and sorting
get_article_list({
  category: "Analysis",
  sortBy: "createdAt",
  sortOrder: "desc",
  search: "keyword",
  page: 1,
  limit: 10
})
```

#### 3. **get_article** - View specific article
```typescript
get_article({
  articleId: "article-id-here"
})
```

#### 4. **update_article** - Edit existing article
```typescript
update_article({
  articleId: "article-id-here",
  title: "Updated Title",
  content: "Updated content...",
  category: "New Category"
})
```

#### 5. **delete_article** - Remove article
```typescript
delete_article({
  articleId: "article-id-here"
})
```

#### 6. **get_article_stats** - View statistics
```typescript
get_article_stats()
```

## 🔧 Workflow Examples

### Example 1: Save Analysis Results
1. Use a prompt to generate analysis content
2. Copy the AI response
3. Call `create_article` with the content:
   ```typescript
   create_article({
     title: "Stock Analysis - AAPL Q4 2024",
     content: "# Apple Inc. Financial Analysis...",
     category: "Financial Analysis",
     tags: ["stocks", "apple", "q4-2024"],
     promptId: "your-analysis-prompt-id"
   })
   ```

### Example 2: Organize Articles by Category
1. Create articles with consistent categories:
   - "Financial Analysis"
   - "Research Reports" 
   - "Creative Writing"
   - "Code Documentation"

2. Use filtering to find related articles:
   ```typescript
   get_article_list({
     category: "Financial Analysis",
     sortBy: "createdAt",
     sortOrder: "desc"
   })
   ```

### Example 3: Search and Edit Workflow
1. Search for articles:
   ```typescript
   get_article_list({
     search: "stock analysis",
     sortBy: "title"
   })
   ```

2. Get specific article:
   ```typescript
   get_article({ articleId: "found-article-id" })
   ```

3. Edit if needed:
   ```typescript
   update_article({
     articleId: "found-article-id",
     content: "Updated analysis with new data..."
   })
   ```

## 📊 Article Management Features

### Sorting Options
- **title** - Alphabetical by title
- **category** - Group by category
- **createdAt** - Newest or oldest first
- **updatedAt** - Recently modified first

### Filtering Options
- **category** - Filter by specific category
- **search** - Search in title and content
- **tags** - Filter by tags (coming soon)

### Metadata Tracking
Articles automatically track:
- Word count
- Character count
- Creation date
- Last modified date
- Source prompt (if specified)
- Custom metadata (AI model, generation parameters, etc.)

## 🎯 Best Practices

### 1. Consistent Categorization
Use consistent category names:
- "Financial Analysis"
- "Research Reports"
- "Creative Writing"
- "Technical Documentation"
- "Meeting Notes"

### 2. Meaningful Titles
Use descriptive titles that include:
- Topic/subject
- Date (if relevant)
- Type of content

Examples:
- "Pop Mart Q1 2024 Stock Analysis"
- "Ancient Calligraphy Research - Wang Xizhi"
- "API Documentation - User Authentication"

### 3. Useful Tags
Add relevant tags for better organization:
- Subject matter: ["stocks", "crypto", "ai"]
- Content type: ["analysis", "summary", "tutorial"]
- Status: ["draft", "final", "needs-review"]

### 4. Source Tracking
Always include `promptId` when creating articles from prompts to maintain traceability.

### 5. Metadata Usage
Use metadata to store additional context:
```json
{
  "aiModel": "claude-3-sonnet",
  "temperature": 0.7,
  "generatedAt": "2025-01-19T10:30:00Z",
  "sourceUrl": "https://example.com/data",
  "version": "1.0"
}
```

## 🔐 API Authentication

All article operations require authentication. The MCP server handles this automatically using your configured API token.

## 📱 Frontend Access (Coming Soon)

The web interface for article management will include:
- Article list view with sorting and filtering
- Article editor with markdown preview
- Category management
- Search functionality
- Export options

## 🐛 Troubleshooting

### Migration Issues
If the migration fails:
1. Check database connection
2. Ensure user has necessary permissions
3. Check for existing articles table
4. Review error logs

### MCP Connection Issues
If article functions aren't available in Cursor:
1. Restart the MCP server
2. Check API token configuration
3. Verify backend is running
4. Check network connectivity

### Permission Errors
Articles are user-specific. Each user can only:
- Create their own articles
- View their own articles
- Edit their own articles
- Delete their own articles

## 📚 API Reference

### Base URL
- Local: `http://localhost:3000/api/articles`
- Production: `https://your-domain.com/api/articles`

### Endpoints

#### GET `/articles`
List articles with pagination and filtering

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `sortBy` (string): Sort field (title|category|createdAt|updatedAt)
- `sortOrder` (string): Sort direction (asc|desc)
- `category` (string): Filter by category
- `search` (string): Search in title and content

#### GET `/articles/:id`
Get specific article by ID

#### POST `/articles`
Create new article

**Body:**
```json
{
  "title": "Article Title",
  "content": "Markdown content...",
  "category": "Optional category",
  "tags": ["tag1", "tag2"],
  "promptId": "optional-prompt-id",
  "metadata": {}
}
```

#### PUT `/articles/:id`
Update existing article

#### DELETE `/articles/:id`
Delete article

#### GET `/articles/stats/overview`
Get article statistics

## 🔄 Future Enhancements

Planned features:
- Export articles to various formats (PDF, DOCX, etc.)
- Article templates
- Collaborative editing
- Version history
- Advanced search with filters
- Article sharing between users
- Integration with external tools

---

## Support

If you encounter any issues or need help:
1. Check the troubleshooting section above
2. Review the API logs for error details
3. Ensure all prerequisites are met
4. Contact support with specific error messages

The Article Storage feature enhances your AI workflow by providing a centralized place to store, organize, and manage all your AI-generated content!
