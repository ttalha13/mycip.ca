import { useState, useEffect, useRef } from 'react';
import { Star, Quote, Users, TrendingUp, Award, Globe, ChevronLeft, ChevronRight, Send, User, MessageSquare, Loader2, CheckCircle } from 'lucide-react';
import { gsap } from 'gsap';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

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

export default function TestimonialSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
    immigration_status: ''
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const statsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Fallback testimonials data
  const fallbackTestimonials: Testimonial[] = [
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

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      setError(null);
      
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
        setTestimonials(formattedTestimonials);
      } else {
        // Use fallback testimonials if no data
        setTestimonials(fallbackTestimonials);
      }
    } catch (error: any) {
      console.error('Error in fetchTestimonials:', error);
      setError('Failed to load testimonials');
      // Use fallback testimonials on error
      setTestimonials(fallbackTestimonials);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { icon: Users, value: `${testimonials.length}+`, label: 'Success Stories', color: 'text-red-500' },
    { icon: TrendingUp, value: '98.5%', label: 'Success Rate', color: 'text-green-500' },
    { icon: Award, value: '10', label: 'Provinces Covered', color: 'text-blue-500' },
    { icon: Globe, value: '10+', label: 'Countries', color: 'text-purple-500' }
  ];

  // Fetch testimonials on component mount
  useEffect(() => {
    fetchTestimonials();
  }, []);

  // Initialize GSAP animations
  useEffect(() => {
    if (!containerRef.current || loading) return;

    // Animate header on mount
    gsap.fromTo(headerRef.current, 
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
    );

    // Animate stats
    gsap.fromTo(statsRef.current?.children || [], 
      { opacity: 0, y: 30, scale: 0.8 },
      { 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        duration: 0.8, 
        stagger: 0.1, 
        delay: 0.3,
        ease: "back.out(1.7)" 
      }
    );

    // Initial card setup
    cardRefs.current.forEach((card, index) => {
      if (card) {
        gsap.set(card, {
          rotationY: index === currentIndex ? 0 : index < currentIndex ? -90 : 90,
          opacity: index === currentIndex ? 1 : 0,
          scale: index === currentIndex ? 1 : 0.8,
          z: index === currentIndex ? 0 : -100
        });
      }
    });

  }, [loading, currentIndex]);

  // Auto-rotate testimonials
  useEffect(() => {
    if (loading || testimonials.length === 0) return;
    
    const interval = setInterval(() => {
      if (!isAnimating) {
        nextTestimonial();
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [currentIndex, isAnimating, loading, testimonials.length]);

  const nextTestimonial = () => {
    if (isAnimating || testimonials.length <= 1) return;
    setIsAnimating(true);
    
    const nextIndex = (currentIndex + 1) % testimonials.length;
    animateTransition(nextIndex);
  };

  const prevTestimonial = () => {
    if (isAnimating || testimonials.length <= 1) return;
    setIsAnimating(true);
    
    const prevIndex = currentIndex === 0 ? testimonials.length - 1 : currentIndex - 1;
    animateTransition(prevIndex);
  };

  const goToTestimonial = (index: number) => {
    if (isAnimating || index === currentIndex || testimonials.length <= 1) return;
    setIsAnimating(true);
    animateTransition(index);
  };

  const animateTransition = (newIndex: number) => {
    const currentCard = cardRefs.current[currentIndex];
    const nextCard = cardRefs.current[newIndex];

    const tl = gsap.timeline({
      onComplete: () => {
        setCurrentIndex(newIndex);
        setIsAnimating(false);
      }
    });

    // Animate out current card
    if (currentCard) {
      tl.to(currentCard, {
        rotationY: newIndex > currentIndex ? -90 : 90,
        opacity: 0,
        scale: 0.8,
        z: -100,
        duration: 0.4,
        ease: "power2.in"
      });
    }

    // Animate in next card
    if (nextCard) {
      tl.fromTo(nextCard, 
        {
          rotationY: newIndex > currentIndex ? 90 : -90,
          opacity: 0,
          scale: 0.8,
          z: -100
        },
        {
          rotationY: 0,
          opacity: 1,
          scale: 1,
          z: 0,
          duration: 0.5,
          ease: "power2.out"
        },
        "-=0.2"
      );
    }
  };

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

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to submit a review');
      return;
    }

    if (!reviewForm.comment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    if (reviewForm.comment.length < 10) {
      toast.error('Comment must be at least 10 characters long');
      return;
    }

    if (!reviewForm.immigration_status.trim()) {
      toast.error('Please select your immigration status');
      return;
    }

    setSubmittingReview(true);

    try {
      const { error } = await supabase
        .from('testimonials')
        .insert([
          {
            user_name: user.email?.split('@')[0] || 'Anonymous User',
            rating: reviewForm.rating,
            comment: reviewForm.comment.trim(),
            immigration_status: reviewForm.immigration_status
          }
        ]);

      if (error) {
        throw error;
      }

      toast.success('Thank you for sharing your story! Your review has been submitted.', {
        duration: 4000,
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      });

      // Reset form
      setReviewForm({
        rating: 5,
        comment: '',
        immigration_status: ''
      });
      setShowReviewForm(false);

      // Refresh testimonials to show the new one
      await fetchTestimonials();

    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStarRating = (rating: number, onRatingChange?: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-6 w-6 transition-colors duration-200 cursor-pointer ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'
        } ${onRatingChange ? 'hover:text-yellow-400' : ''}`}
        onClick={() => onRatingChange && onRatingChange(i + 1)}
      />
    ));
  };

  // Show loading state
  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
              Success Stories That Inspire
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Real journeys, real results. Discover how thousands achieved their Canadian dream through MyCIP
            </p>
          </div>
          
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="animate-spin h-12 w-12 mx-auto text-purple-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Loading success stories...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

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
              className="text-center group cursor-pointer"
              onMouseEnter={() => {
                gsap.to(statsRef.current?.children[index], {
                  scale: 1.1,
                  y: -5,
                  duration: 0.3,
                  ease: "power2.out"
                });
              }}
              onMouseLeave={() => {
                gsap.to(statsRef.current?.children[index], {
                  scale: 1,
                  y: 0,
                  duration: 0.3,
                  ease: "power2.out"
                });
              }}
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
          <div 
            ref={containerRef}
            className="perspective-1000 min-h-[500px] flex items-center justify-center"
            style={{ perspective: '1000px' }}
          >
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                ref={el => cardRefs.current[index] = el}
                className="absolute w-full max-w-4xl"
                style={{ transformStyle: 'preserve-3d' }}
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
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${testimonial.avatar_color} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                        {getInitials(testimonial.user_name)}
                      </div>
                      <div className="ml-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {testimonial.user_name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          From {testimonial.country}
                        </p>
                      </div>
                      <div className="ml-auto">
                        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(testimonial.immigration_status)}`}>
                          {testimonial.immigration_status}
                        </span>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center justify-center mb-6">
                      {renderStars(testimonial.rating)}
                    </div>

                    {/* Testimonial Text */}
                    <blockquote className="text-xl md:text-2xl font-medium text-gray-700 dark:text-gray-300 text-center leading-relaxed mb-8">
                      "{testimonial.comment}"
                    </blockquote>

                    {/* Date */}
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                      {new Date(testimonial.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center mt-12 space-x-6">
            <button
              onClick={prevTestimonial}
              disabled={isAnimating || testimonials.length <= 1}
              className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
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
                    disabled={isAnimating}
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
              disabled={isAnimating || testimonials.length <= 1}
              className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <ChevronRight className="h-6 w-6 text-gray-600 dark:text-gray-300 group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-20">
          {/* Submit Your Review Section */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Share Your Success Story
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Help others by sharing your Canadian immigration journey and experience
              </p>
            </div>

            {!showReviewForm ? (
              <div className="text-center">
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-green-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Submit Your Review
                </button>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
                  <form onSubmit={handleReviewSubmit} className="space-y-6">
                    {/* Rating */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        <Star className="inline-block w-4 h-4 mr-2 mb-1" />
                        Your Rating
                      </label>
                      <div className="flex items-center space-x-1">
                        {renderStarRating(reviewForm.rating, (rating) => 
                          setReviewForm({ ...reviewForm, rating })
                        )}
                        <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                          ({reviewForm.rating} star{reviewForm.rating !== 1 ? 's' : ''})
                        </span>
                      </div>
                    </div>

                    {/* Immigration Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <User className="inline-block w-4 h-4 mr-2 mb-1" />
                        Your Immigration Status
                      </label>
                      <select
                        required
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                        value={reviewForm.immigration_status}
                        onChange={(e) => setReviewForm({ ...reviewForm, immigration_status: e.target.value })}
                        disabled={submittingReview}
                      >
                        <option value="">Select your status</option>
                        <option value="Permanent Resident">Permanent Resident</option>
                        <option value="Express Entry ITA">Express Entry ITA</option>
                        <option value="PNP Nominee">PNP Nominee</option>
                        <option value="Quebec Resident">Quebec Resident</option>
                        <option value="Work Permit Holder">Work Permit Holder</option>
                        <option value="Study Permit Holder">Study Permit Holder</option>
                        <option value="In Process">Application In Process</option>
                        <option value="Exploring Options">Exploring Options</option>
                      </select>
                    </div>

                    {/* Comment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <MessageSquare className="inline-block w-4 h-4 mr-2 mb-1" />
                        Your Story
                      </label>
                      <textarea
                        rows={4}
                        required
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        placeholder="Share your experience with MyCIP and your immigration journey..."
                        disabled={submittingReview}
                        maxLength={1000}
                      />
                      <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {reviewForm.comment.length}/1000 characters
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowReviewForm(false);
                          setReviewForm({ rating: 5, comment: '', immigration_status: '' });
                        }}
                        disabled={submittingReview}
                        className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="flex-1 flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submittingReview ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            Submit Review
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Existing Call to Action */}
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