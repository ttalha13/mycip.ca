# MyCIP - Canadian Immigration Pathways

Your trusted companion for navigating Canadian immigration pathways. Get expert guidance on PR applications, provincial programs, and immigration updates.

## 🚀 Features

- **Comprehensive Province Guide** - Detailed information for all 13 Canadian provinces and territories
- **Real-time Immigration Updates** - Latest policy changes and program updates
- **CRS Score Calculator** - Direct link to official government calculator
- **Success Stories** - Real testimonials from successful immigrants
- **Expert Contact System** - WhatsApp integration for direct consultation
- **Hybrid Authentication** - Supports both Supabase and local storage users
- **Dark/Light Mode** - Auto-switching based on time of day
- **Mobile Responsive** - Optimized for all devices

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom animations
- **Authentication**: Hybrid Supabase + Local Storage system
- **Routing**: React Router v6 with future flags
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Deployment**: Netlify with custom domain

## 🏗️ Architecture

### Authentication System
- **Hybrid Approach**: Tries Supabase first, falls back to local storage
- **User Preservation**: Maintains all existing Supabase users
- **Instant Signup**: New users can register without email verification
- **Password Reset**: Works for both Supabase and local users

### Database Schema
- **User Profiles**: Comprehensive immigration profile data
- **Contact Messages**: WhatsApp-integrated contact system
- **Testimonials**: User success stories and ratings
- **Activity Logging**: User interaction tracking

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mycip.git
   cd mycip
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Add your Supabase credentials
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🌐 Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📱 Contact Integration

The contact form integrates with WhatsApp for instant communication:
- **WhatsApp Number**: +1 (705) 970-2705
- **Auto-formatted Messages**: All form data is pre-formatted
- **Fallback System**: Instagram contact if WhatsApp fails

## 🎨 Design Features

- **Canadian Theme**: Red and white color scheme with flag animations
- **Apple-level Design**: Premium UI/UX with micro-interactions
- **Responsive Layout**: Mobile-first design approach
- **Accessibility**: WCAG compliant with proper contrast ratios

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React context providers
├── data/              # Static data and configurations
├── lib/               # Utility libraries and configurations
├── pages/             # Page components
├── types/             # TypeScript type definitions
└── main.tsx           # Application entry point
```

## 🚀 Deployment

### Netlify Deployment

1. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`

2. **Environment variables**: Add your Supabase credentials

3. **Custom domain**: Configure `mycip.ca` with proper redirects

### Security Features

- **CSP Headers**: Content Security Policy implementation
- **HTTPS Enforcement**: Automatic HTTPS redirects
- **XSS Protection**: Cross-site scripting prevention
- **CSRF Protection**: Cross-site request forgery prevention

## 📊 Analytics & SEO

- **Google Search Console**: Verified ownership
- **Structured Data**: Schema.org implementation
- **Meta Tags**: Comprehensive social media optimization
- **Sitemap**: Auto-generated XML sitemap

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Talha**
- Instagram: [@ttalha_13](https://www.instagram.com/ttalha_13/)
- LinkedIn: [Talha](https://www.linkedin.com/in/talha-806869188/)
- Twitter: [@abu4323](https://x.com/abu4323)
- YouTube: [@ttalha.13](https://www.youtube.com/@ttalha.13)

## 🙏 Acknowledgments

- Immigration data sourced from official Government of Canada websites
- Province images from Unsplash
- Canadian flag from Wikimedia Commons
- Icons by Lucide React

---

**Made with ❤️ for the Canadian immigration community**