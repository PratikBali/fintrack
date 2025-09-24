# FinTrack Pro - Personal Expense Tracker

A modern, feature-rich expense tracking application built with Next.js, TypeScript, and Firebase. FinTrack Pro helps you manage your finances with an intuitive interface, AI-powered receipt scanning, and comprehensive expense categorization.

![FinTrack Pro Dashboard](https://via.placeholder.com/800x400/1f2937/ffffff?text=FinTrack+Pro+Dashboard)

## 🚀 Features

### Core Functionality
- **Expense Tracking**: Add, view, edit, and delete expenses with detailed categorization
- **Income Management**: Track both income and expenses with visual indicators
- **Dashboard Analytics**: Beautiful charts and statistics showing your financial overview
- **Category Management**: Pre-defined categories (Food, Rent, Transport, Entertainment, etc.)

### Advanced Features
- **AI Receipt Scanning**: Upload receipt photos and automatically extract transaction details using AI
- **Firebase Authentication**: Secure login with email/password and Google OAuth
- **Real-time Data**: Cloud-based storage with Firebase Firestore
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Modern UI**: Built with Radix UI components and Tailwind CSS

### User Experience
- **Search Functionality**: Quick search through transactions
- **Date Picker**: Easy date selection for transactions
- **Toast Notifications**: User-friendly feedback for all actions
- **Loading States**: Smooth loading indicators throughout the app
- **Form Validation**: Comprehensive input validation with error messages

## 🛠️ Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Unstyled, accessible UI components
- **React Hook Form** - Performant forms with easy validation
- **Zod** - TypeScript-first schema validation
- **Recharts** - Responsive chart library
- **Lucide React** - Beautiful & consistent icons

### Backend & Services
- **Firebase Auth** - Authentication service
- **Firebase Firestore** - NoSQL database
- **Google AI (Genkit)** - AI-powered receipt scanning
- **Next.js API Routes** - Server-side functionality

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **TypeScript** - Static type checking

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Firebase project (for authentication and database)
- Google AI API key (for receipt scanning)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fintrack-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Configuration**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password and Google providers)
   - Enable Firestore Database
   - Copy your Firebase config and update `/src/lib/firebase.ts`

4. **Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   GOOGLE_GENAI_API_KEY=your_google_ai_api_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:9002](http://localhost:9002)

## 🚀 Available Scripts

- `npm run dev` - Start development server on port 9002
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint for code linting
- `npm run typecheck` - Run TypeScript type checking
- `npm run deploy` - Deploy to Firebase Hosting

## 📱 Usage Guide

### Getting Started
1. **Sign Up/Login**: Create an account or sign in with Google
2. **Add Transactions**: Click the "Add Transaction" button to record expenses or income
3. **Upload Receipts**: Optionally upload receipt photos for AI-powered data extraction
4. **View Dashboard**: Monitor your financial overview with charts and statistics
5. **Manage Categories**: Organize transactions by predefined categories

### Key Features Walkthrough

#### Adding Transactions
- Click the floating action button (mobile) or "Add Transaction" button (desktop)
- Fill in amount, vendor, date, and category
- Optionally upload a receipt photo
- Use "Scan with AI" to automatically extract transaction details
- Add notes for additional context

#### Dashboard Overview
- **Stats Cards**: Quick overview of total income, expenses, balance, and monthly spending
- **Overview Chart**: Monthly expense trends visualization
- **Recent Transactions**: Latest transaction history with avatars and categorization

#### Authentication
- Email/password registration and login
- Google OAuth integration
- Secure session management
- Automatic redirect to login when not authenticated

## 🔧 Configuration

### Firebase Setup
Update the Firebase configuration in `/src/lib/firebase.ts`:

```typescript
const firebaseConfig = {
  projectId: "your-project-id",
  appId: "your-app-id",
  storageBucket: "your-storage-bucket",
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  messagingSenderId: "your-sender-id",
};
```

### Customization
- **Categories**: Modify categories in `/src/lib/data.ts`
- **Styling**: Update Tailwind configuration in `tailwind.config.ts`
- **Components**: Customize UI components in `/src/components/ui/`

## 🔐 Security Features

- **Firebase Authentication**: Secure user authentication and session management
- **Input Validation**: Comprehensive form validation using Zod schemas
- **Protected Routes**: Automatic redirection for unauthenticated users
- **Environment Variables**: Sensitive configuration stored securely

## 📊 Future Enhancements

- **Budgeting**: Set and track monthly spending budgets
- **Group Expenses**: Split bills with friends and family
- **Reports**: Generate detailed financial reports
- **Ledger**: Customer and supplier credit/debit management
- **Data Export**: Export transactions to CSV/PDF
- **Recurring Transactions**: Set up automatic recurring expenses
- **Multi-currency Support**: Handle multiple currencies
- **Bank Integration**: Connect bank accounts for automatic transaction import

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Radix UI](https://www.radix-ui.com/) for accessible UI components
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [Firebase](https://firebase.google.com/) for backend services
- [Lucide](https://lucide.dev/) for beautiful icons
- [Recharts](https://recharts.org/) for responsive charts

## 📞 Support

For support, email support@fintrackpro.com or create an issue in the repository.

---

**FinTrack Pro** - Take control of your finances with style and intelligence! 💰✨