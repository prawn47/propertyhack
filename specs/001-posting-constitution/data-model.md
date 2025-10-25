# Data Model: Posting Constitution

Created: 2025-10-24  
Branch: 001-posting-constitution

## Entities

### User
- id: string (cuid)
- email: string (unique)
- emailVerified: boolean (default false)
- createdAt: datetime
- updatedAt: datetime
- Relations: settings (1:1 UserSettings), draftPosts (1:N DraftPost), publishedPosts (1:N PublishedPost)

### UserSettings
- id: string (cuid)
- userId: string (unique, FK → User.id)
- toneOfVoice: string
- industry: string
- position: string
- audience: string
- postGoal: string
- keywords: string
- contentExamples: string (JSON string array)
- timeZone: string
- preferredTime: string (HH:mm)
- profilePictureUrl: string? (nullable)
- englishVariant: string
- createdAt: datetime
- updatedAt: datetime

### DraftPost
- id: string (cuid)
- userId: string (FK → User.id)
- title: string
- text: string
- imageUrl: string? (nullable)
- isPublishing: boolean (default false)
- createdAt: datetime
- updatedAt: datetime

### PublishedPost
- id: string (cuid)
- userId: string (FK → User.id)
- title: string
- text: string
- imageUrl: string? (nullable)
- publishedAt: string (timestamp string)
- createdAt: datetime

### ScheduledPost (new)
- id: string (cuid)
- userId: string (FK → User.id)
- title: string
- text: string
- imageUrl: string? (nullable)
- scheduledFor: datetime (in user’s time zone)
- status: enum("scheduled" | "published" | "cancelled" | "failed")
- createdAt: datetime
- updatedAt: datetime

## Relationships
- User 1:1 UserSettings
- User 1:N DraftPost
- User 1:N PublishedPost
- User 1:N ScheduledPost

## Validation Rules
- User.email must be valid and unique.
- UserSettings.contentExamples must be parseable JSON array of strings.
- DraftPost.title and text are required; text length practical limits enforced at UI.
- ScheduledPost.scheduledFor must be in the future at creation; status transitions: scheduled → published|failed|cancelled.

## State Transitions
- DraftPost → PublishedPost (on publish now) or DraftPost → ScheduledPost (on schedule).
- ScheduledPost: scheduled → published (on success), scheduled → failed (on error), scheduled → cancelled (on user action).
