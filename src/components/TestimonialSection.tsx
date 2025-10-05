import { useState, useEffect, useRef, useCallback } from 'react';
import { Star, Quote, Users, TrendingUp, Award, Globe, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Testimonial {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  immigration_status: string;
  created_at: string;
  avatar_color: string;
  country: string;
}

// Move built-in testimonials outside component to prevent recreation on every render
const BUILT_IN_TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    user_name: 'Sarah Chen',
    rating: 5,
    comment: 'MyCIP transformed my immigration journey completely! The detailed province guides helped me choose Alberta PNP, and I received my nomination within 4 months. The step-by-step guidance was invaluable.',
    immigration_status: 'Permanent Resident',
    created_at: '2024-01-15T10:00:00Z',
    avatar_color: 'from-pink-400 to-purple-600',
    country: 'China'
  },
  {
    id: '2',
    user_name: 'Rajesh Patel',
    rating: 4,
    comment: 'The CRS calculator and Express Entry guidance on MyCIP helped me understand exactly what I needed to improve. Increased my score from 420 to 485 and got my ITA! Couldn\'t have done it without this platform.',
    immigration_status: 'Express Entry ITA',
    created_at: '2024-01-20T14:30:00Z',
    avatar_color: 'from-blue-400 to-cyan-600',
    country: 'India'
  },
  {
    id: '3',
    user_name: 'Lakhwinder Singh',
    rating: 5,
    comment: 'As a healthcare professional, MyCIP\'s detailed information about provincial healthcare programs was exactly what I needed. Successfully immigrated to Nova Scotia through their healthcare stream!',
    immigration_status: 'PNP Nominee',
    created_at: '2024-02-01T09:15:00Z',
    avatar_color: 'from-green-400 to-emerald-600',
    country: 'India'
  },
  {
    id: '4',
    user_name: 'Navseerat Kaur',
    rating: 5,
    comment: 'The comprehensive pathway information saved me months of research. MyCIP\'s updates on immigration draws helped me time my application perfectly. Now proudly living in Toronto!',
    immigration_status: 'Permanent Resident',
    created_at: '2024-02-10T16:45:00Z',
    avatar_color: 'from-orange-400 to-red-600',
    country: 'India'
  },
  {
    id: '5',
    user_name: 'Simarjit Singh',
    rating: 5,
    comment: 'MyCIP\'s detailed breakdown of Quebec immigration programs helped me navigate the unique requirements. The French language preparation tips were spot-on. Merci beaucoup!',
    immigration_status: 'Quebec Resident',
    created_at: '2024-02-15T11:30:00Z',
    avatar_color: 'from-purple-400 to-indigo-600',
    country: 'India'
  },
  {
    id: '6',
    user_name: 'Farneet Singh Longia',
    rating: 5,
    comment: 'The platform\'s real-time updates and expert insights made all the difference. From international student to PR in 18 months - MyCIP guided every step of my journey!',
    immigration_status: 'Permanent Resident',
    created_at: '2024-02-20T16:20:00Z',
    avatar_color: 'from-teal-400 to-blue-600',
    country: 'India'
  }
];

export default function TestimonialSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const getAvatarColor = (name: string): string => {
    const colors = [
      'from-pink-400 to-purple-600',
      'from-blue-400 to-cyan-600', 
      'from-green-400 to-emerald-600',
      'from-orange-400 to-red-600',
      'from-purple-400 to-indigo-600',
      'from-teal-400 to-blue-600',
      'from-yellow-400 to-orange-600',
      'from-indigo-400 to-purple-600'
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const fetchTestimonials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let allTestimonials = [...BUILT_IN_TESTIMONIALS];

      const { data, error: fetchError } = await supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) {
        console.error('Error fetching testimonials:', fetchError);
        throw fetchError;
      }

      if (data && data.length > 0) {
        const formattedTestimonials = data.map(testimonial => ({
          ...testimonial,
          avatar_color: getAvatarColor(testimonial.user_name),
          country: 'Canada' // Default country since we don't store this
        }));
        // Add user testimonials after built-in ones
        allTestimonials = [...BUILT_IN_TESTIMONIALS, ...formattedTestimonials];
      }

      setTestimonials(allTestimonials);
    } catch (error: any) {
      console.error('Error in fetchTestimonials:', error);
      setError('Failed to load testimonials');
      // Use built-in testimonials on error
      setTestimonials(BUILT_IN_TESTIMONIALS);
    } finally {
      setLoading(false);
    }
  }, []);

  const nextTestimonial = useCallback(() => {
    if (testimonials.length <= 1) return;
    const nextIndex = (currentIndex + 1) % testimonials.length;
    setCurrentIndex(nextIndex);
  }, [testimonials.length, currentIndex]);

  const prevTestimonial = useCallback(() => {
    if (testimonials.length <= 1) return;
    const prevIndex = currentIndex === 0 ? testimonials.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
  }, [testimonials.length, currentIndex]);

  const goToTestimonial = useCallback((index: number) => {
    if (index === currentIndex || testimonials.length <= 1) return;
    setCurrentIndex(index);
  }, [currentIndex, testimonials.length]);

  const stats = [
    { icon: Users, value: `${testimonials.length}+`, label: 'Success Stories', color: 'text-red-500' },
    { icon: TrendingUp, value: '98.5%', label: 'Success Rate', color: 'text-green-500' },
    { icon: Award, value: '10', label: 'Provinces Covered', color: 'text-blue-500' },
    { icon: Globe, value: '10+', label: 'Countries', color: 'text-purple-500' }
  ];

  // Fetch testimonials on component mount
  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  // Auto-rotate testimonials
  useEffect(() => {
    if (loading || testimonials.length <= 1) return;
    
    const interval = setInterval(() => {
      nextTestimonial();
    }, 6000);

    return () => clearInterval(interval);
  }, [loading, testimonials.length, nextTestimonial]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 transition-colors duration-300 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ));
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('permanent resident')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    } else if (statusLower.includes('pnp') || statusLower.includes('nominee')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    } else if (statusLower.includes('express entry') || statusLower.includes('ita')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    } else if (statusLower.includes('quebec')) {
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
    } else {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
            Success Stories That Inspire
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Real journeys, real results. Discover how thousands achieved their Canadian dream through MyCIP
          </p>
        </div>

        {/* Stats Section */}
        <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center group cursor-pointer transform transition-all duration-300 hover:scale-110 hover:-translate-y-2"
            >
              <div className="flex justify-center mb-4">
                <div className={`p-4 rounded-full bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-700 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </div>
              <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Main Testimonial Carousel */}
        <div className="relative">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="animate-spin h-12 w-12 mx-auto text-purple-500 mb-4" />
                <p className="text-gray-600 dark:text-gray-300">Loading success stories...</p>
              </div>
            </div>
          ) : (
          <div 
            ref={containerRef}
            className="min-h-[500px] flex items-center justify-center"
          >
            {testimonials.length > 0 && (
              <div
                key={testimonials[currentIndex].id}
                className="w-full max-w-4xl transition-all duration-500 ease-in-out"
              >
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 md:p-12 relative overflow-hidden">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-500 via-purple-500 to-blue-500"></div>
                  </div>
                  
                  {/* Quote Icon */}
                  <div className="absolute top-6 left-6 opacity-10">
                    <Quote className="h-16 w-16 text-red-500" />
                  </div>

                  <div className="relative z-10">
                    {/* Avatar and Info */}
                    <div className="flex items-center mb-8">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${testimonials[currentIndex].avatar_color} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                        {getInitials(testimonials[currentIndex].user_name)}
                      </div>
                      <div className="ml-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {testimonials[currentIndex].user_name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          From {testimonials[currentIndex].country}
                        </p>
                      </div>
                      <div className="ml-auto">
                        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(testimonials[currentIndex].immigration_status)}`}>
                          {testimonials[currentIndex].immigration_status}
                        </span>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center justify-center mb-6">
                      {renderStars(testimonials[currentIndex].rating)}
                    </div>

                    {/* Testimonial Text */}
                    <blockquote className="text-xl md:text-2xl font-medium text-gray-700 dark:text-gray-300 text-center leading-relaxed mb-8">
                      "{testimonials[currentIndex].comment}"
                    </blockquote>

                    {/* Date */}
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                      {new Date(testimonials[currentIndex].created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Navigation Controls */}
          {!loading && (
            <div className="flex items-center justify-center mt-12 space-x-6">
            <button
              onClick={prevTestimonial}
              disabled={testimonials.length <= 1}
              className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group transform hover:scale-110"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-red-500 transition-colors" />
            </button>

            {/* Indicators */}
            {testimonials.length > 1 && (
              <div className="flex space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentIndex
                        ? 'bg-red-500 scale-125'
                        : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>
            )}

            <button
              onClick={nextTestimonial}
              disabled={testimonials.length <= 1}
              className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group transform hover:scale-110"
            >
              <ChevronRight className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-red-500 transition-colors" />
            </button>
          </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="mt-20">
          <div className="text-center">
            <div className="bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 rounded-2xl p-1">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 md:p-12">
                <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
                  Ready to Write Your Success Story?
                </h3>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                  Join thousands of successful immigrants who found their path through MyCIP
                </p>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="bg-gradient-to-r from-red-500 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-red-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Start Your Journey Today
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}