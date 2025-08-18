# Prompt House Premium Frontend

A modern React/Next.js frontend for the Premium Prompt House application.

## 🚀 Features

- **Modern UI**: Built with Next.js 14, React 18, and Tailwind CSS
- **Authentication**: Complete login/register system with JWT tokens
- **Dashboard**: User stats, recent prompts, and quick actions
- **Responsive Design**: Works perfectly on desktop and mobile
- **Type Safety**: Full TypeScript implementation
- **State Management**: Zustand for efficient state handling
- **API Integration**: Axios-based API client with error handling

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form
- **Notifications**: React Hot Toast
- **Icons**: Heroicons

## 📦 Installation

```bash
cd prompt-house-premium/frontend
npm install
```

## 🔧 Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## 🌐 Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=https://prombank.app/api
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard layout and page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # Reusable components
│   └── Sidebar.tsx        # Navigation sidebar
├── lib/                   # Utilities
│   └── api.ts             # API client
├── stores/                # Zustand stores
│   └── authStore.ts       # Authentication state
└── types/                 # TypeScript definitions
    └── index.ts           # Type definitions
```

## 🎨 Design System

### Colors
- **Brand**: Blue theme (`brand-50` to `brand-900`)
- **Status**: Green (success), Red (error), Yellow (warning)
- **Neutral**: Gray scale for text and backgrounds

### Components
- **Cards**: Rounded corners, subtle shadows
- **Buttons**: Primary (brand), Secondary (gray), Ghost (transparent)
- **Forms**: Clean inputs with focus states
- **Navigation**: Sidebar with active states

## 🔐 Authentication Flow

1. **Landing Page**: Marketing homepage with sign-up CTA
2. **Login/Register**: Form-based authentication
3. **Dashboard**: Protected route with user stats
4. **Token Management**: Automatic token refresh and logout

## 📱 Pages

### Public Pages
- **Homepage** (`/`): Marketing landing page
- **Login** (`/auth/login`): User authentication
- **Register** (`/auth/register`): User registration

### Protected Pages
- **Dashboard** (`/dashboard`): User overview and stats
- **My Prompts** (`/prompts`): User's prompt library
- **Public Prompts** (`/prompts/public`): Community prompts
- **Analytics** (`/analytics`): Usage insights
- **Settings** (`/settings`): Account management

## 🔌 API Integration

The frontend connects to the backend API at `https://prombank.app/api`:

- **Authentication**: Login, register, logout
- **User Management**: Profile, stats, settings
- **Prompts**: CRUD operations, public/private visibility
- **Analytics**: Usage statistics and insights

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Deploy to Vercel
vercel --prod
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production
```env
NEXT_PUBLIC_API_URL=https://prombank.app/api
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run type checking
npx tsc --noEmit
```

## 📄 API Documentation

The frontend expects the backend API to provide these endpoints:

- `POST /auth/login` - User authentication
- `POST /auth/register` - User registration
- `GET /user/profile` - User profile data
- `GET /user/stats` - User statistics
- `GET /prompts` - User's prompts
- `GET /prompts/public` - Public prompts
- `POST /prompts` - Create prompt
- `PUT /prompts/:id` - Update prompt
- `DELETE /prompts/:id` - Delete prompt

## 🔧 Development Tips

1. **Hot Reload**: Changes automatically refresh in development
2. **TypeScript**: All components are fully typed
3. **Responsive**: Test on different screen sizes
4. **Error Handling**: Check browser console for API errors
5. **State**: Use React DevTools to inspect Zustand state

## 🎯 Performance

- **SSG**: Static generation for public pages
- **Code Splitting**: Automatic route-based splitting
- **Lazy Loading**: Components loaded on demand
- **Optimized Images**: Next.js Image optimization
- **Bundle Analysis**: Use `npm run analyze` (when configured)

## 🛡️ Security

- **XSS Protection**: React's built-in XSS prevention
- **CSRF**: JWT tokens for authentication
- **Content Security Policy**: Configured in headers
- **Input Validation**: Client and server-side validation

## 🐛 Troubleshooting

### Common Issues

1. **Build Errors**: Check TypeScript types and imports
2. **API Errors**: Verify backend is running and accessible
3. **Auth Issues**: Clear localStorage and try again
4. **Styling Issues**: Check Tailwind class names

### Debug Commands
```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules
rm -rf node_modules package-lock.json
npm install

# Check TypeScript
npx tsc --noEmit
```

## 📞 Support

- **Backend API**: https://prombank.app/api
- **Documentation**: See project README
- **Issues**: Create GitHub issues for bugs

---

Built with ❤️ using Next.js and Tailwind CSS 