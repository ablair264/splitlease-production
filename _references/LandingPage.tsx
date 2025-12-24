import React, { useEffect,useRef, useState } from 'react';
import AccordionShowcase from './AccordionShowcase';
import ShowcaseCarousel from './ShowcaseCarousel';
import NavBar from './NavBar';
import BentoDemo from './BentoDemo';
import CTASection from './CTASection';
import ContactFormModal from './ContactFormModal';
import FeaturesSectionHeader from './FeaturesSectionHeader';
import BlogSection from './BlogSection';
import SplitText from './SplitText';
import { Handshake, ClipboardPaste, ClipboardCheck, Warehouse, BadgePercent, FolderDot, Users, ChevronDown } from 'lucide-react';
import ScrollFadeSection from './ScrollFadeSection';
import { 
  TypewriterHeader,
  FadeInSlideHeader,
  GlitchHeader,
  GradientHeader,
  SplitTextHeader,
  BounceHeader,
  ScaleHeader,
  NeonHeader,
  BlurInHeader
} from './AnimatedHeaders/AnimatedHeaders';
import BusinessCategoriesSection from './simple-html/BusinessCategoriesSection';


const HoverReveal: React.FC = () => {
  const revealImgRef = useRef<HTMLImageElement | null>(null);
  const [scrollArrowOpacity, setScrollArrowOpacity] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      // Start fading when user scrolls 10% of viewport height
      const fadeStart = windowHeight * 0.1;
      // Completely fade by 30% of viewport height
      const fadeEnd = windowHeight * 0.3;
      
      if (scrollY <= fadeStart) {
        setScrollArrowOpacity(1);
      } else if (scrollY >= fadeEnd) {
        setScrollArrowOpacity(0);
      } else {
        // Linear fade between fadeStart and fadeEnd
        const progress = (scrollY - fadeStart) / (fadeEnd - fadeStart);
        setScrollArrowOpacity(1 - progress);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        // Full-viewport hero height across devices
        height: '100dvh',
        minHeight: '100svh',
        // Fallback for older browsers
        maxHeight: '100vh',
        background: 'transparent',
      }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const el = revealImgRef.current;
        if (el) {
          el.style.setProperty('--mx', `${x}px`);
          el.style.setProperty('--my', `${y + rect.height * 0.1}px`);
        }
      }}
      onMouseLeave={() => {
        const el = revealImgRef.current;
        if (el) {
          el.style.setProperty('--mx', '-9999px');
          el.style.setProperty('--my', '-9999px');
        }
      }}
    >
      {/* (no pre-header logo block; logo appears in badge position below) */}

      <img
        ref={revealImgRef}
        src="/screenshots/screen2.webp"
        alt="Reveal effect"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          mixBlendMode: 'lighten',
          opacity: 0.35,
          pointerEvents: 'none', 
          '--mx': '-9999px',
          '--my': '-9999px',
          WebkitMaskImage:
            'radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,1) 0px, rgba(255,255,255,0.95) 60px, rgba(255,255,255,0.6) 120px, rgba(255,255,255,0.25) 180px, rgba(255,255,255,0) 240px)',
          maskImage:
            'radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,1) 0px, rgba(255,255,255,0.95) 60px, rgba(255,255,255,0.6) 120px, rgba(255,255,255,0.25) 180px, rgba(255,255,255,0) 240px)',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
        } as React.CSSProperties as any}
      />
      
      {/* Hero Header Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 'clamp(40px, 8vh, 60px) 20px',
          textAlign: 'center',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
      
        {/* Small brand mark where the old badge used to be */}
        <img
          src="/logos/splitfin.png"
          alt="Splitfin logo"
          onError={(e) => {
            const t = e.currentTarget;
            // Fallbacks if PNG isn't found
            const tried = t.getAttribute('data-tried') || '';
            const attempts = tried.split(',').filter(Boolean);
            const candidates = ['/splitfin.png', '/logos/splitfin-white.png', '/splitfin-white.png', '/logos/splitfin-logo.svg', '/splitfin.svg'];
            const next = candidates.find((c) => !attempts.includes(c));
            if (next) {
              t.setAttribute('data-tried', [...attempts, next].join(','));
              t.src = next;
            }
          }}
          style={{
            height: '60px',
            width: 'auto',
            marginBottom: '16px',
            filter:
              'drop-shadow(0 6px 18px rgba(121, 213, 233, 0.15)) drop-shadow(0 0 12px rgba(121, 213, 233, 0.08))',
            opacity: 0.95,
          }}
        />

        {/* Main Headline */}
        <FadeInSlideHeader
          className="hero-main-headline"
          delay={200}
          duration={1000}
        >
          One Workspace. <br></br><span style={{ color: '#75d0e5', fontSize: '56px' }}>Everything Your Business Needs.</span>
        </FadeInSlideHeader>

        <div
          style={{
            marginTop: '8px',
            marginBottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '20px',
            }}
          >
            <span style={{ color: '#5b3eea', fontSize: '20px' }}><Handshake /></span>
            Sales
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '20px',
            }}
          >
            <span style={{ color: '#ea903e', fontSize: '20px' }}><ClipboardPaste /></span>
            Inventory
          </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '20px',
              }}
            >
              <span style={{ color: '#3eea92', fontSize: '20px' }}><Users /></span>
              Customers
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '20px',
              }}
            >
              <span style={{ color: '#3e88ea', fontSize: '20px' }}><BadgePercent /></span>
              Finance
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '20px',
              }}
            >
              <span style={{ color: '#7f13b9', fontSize: '20px' }}><FolderDot /></span>
              Admin
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '20px',
              }}
            >
              <span style={{ color: '#b94f13', fontSize: '20px' }}><Warehouse /></span>
              Warehouse
            </div>
        </div>

        {/* Subheadline */}
        <SplitText
          text="Unify your business in one system."
          tag="p"
          className=""
          splitType="words"
          delay={100}
          duration={0.6}
          from={{ opacity: 0, y: 40 }}
          to={{ opacity: 1, y: 0 }}
          customStyle={{
            fontSize: 'clamp(18px, 2.5vw, 24px)',
            fontWeight: '400',
            lineHeight: '1.5',
            color: 'rgba(255, 255, 255, 0.8)',
            maxWidth: '700px',
          }}
        />
  <BlurInHeader
    delay={100}
    duration={800}
    variant="blurInUp"
    splitBy="word"
    staggerDelay={100}
  >
          <span style={{
            fontSize: 'clamp(18px, 2.5vw, 18px)',
            fontWeight: '800',
            lineHeight: '1.5',
            color: '#79D5E9',
            maxWidth: '700px',
            marginBottom: '50px',
            display: 'block'
          }}>
            Powerful, Flexible, Easy to Use, Quick to Implement.
          </span>
        </BlurInHeader>

        {/* CTA Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <button
            style={{
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #75d0e5 0%, #5ababe 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 30px rgba(124, 58, 237, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(124, 58, 237, 0.3)';
            }}
          >
			Book A Demo
          </button>
          
          <button
            style={{
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: '600',
              background: 'transparent',
              color: '#ffffff',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Get In Touch
          </button>
        </div>

        {/* Scroll Down Arrow */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            zIndex: 10,
            opacity: scrollArrowOpacity,
            pointerEvents: scrollArrowOpacity < 0.1 ? 'none' : 'auto'
          }}
          onClick={() => {
            document.getElementById('features')?.scrollIntoView({ 
              behavior: 'smooth' 
            });
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateX(-50%) translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateX(-50%) translateY(0)';
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '50px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              animation: 'bounce 2s infinite'
            }}
          >
            <span
              style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              Scroll
            </span>
            <ChevronDown 
              size={20} 
              color="rgba(255, 255, 255, 0.8)" 
              style={{
                animation: 'bounceArrow 2s infinite'
              }}
            />
          </div>
        </div>

        {/* Social Proof */}


        {/* (scroll indicator removed) */}
      </div>
    </div>
  );
};

const PricingSection: React.FC = () => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
      `}</style>
      
      <section
        style={{
          padding: '80px 16px',
          fontFamily: "'Poppins', sans-serif",
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              radial-gradient(circle at 20% 80%, rgba(121, 213, 233, 0.05) 1px, transparent 1px),
              radial-gradient(circle at 80% 20%, rgba(247, 125, 17, 0.05) 1px, transparent 1px),
              radial-gradient(circle at 40% 40%, rgba(97, 188, 142, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px, 90px 90px, 120px 120px',
            pointerEvents: 'none',
          }}
        />
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2
              style={{
                fontSize: 'clamp(28px, 5vw, 42px)',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '16px',
                background: 'linear-gradient(135deg, #79d5e9 0%, #f77d11 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Simple, Transparent Pricing
            </h2>
            <p
              style={{
                fontSize: 'clamp(16px, 2.5vw, 20px)',
                color: 'rgba(255, 255, 255, 0.7)',
                maxWidth: '600px',
                margin: '0 auto',
                lineHeight: '1.6',
              }}
            >
              Choose the plan that fits your business needs. No hidden fees, no surprises.
            </p>
          </div>

          {/* Pricing Cards */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '60px',
            }}
          >
            {/* Limited Time Offer */}
            <div
              style={{
                background: 'rgba(247, 125, 17, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(247, 125, 17, 0.4)',
                borderRadius: '20px',
                padding: '40px 32px',
                textAlign: 'center',
                position: 'relative',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                transform: 'scale(1.05)',
                boxShadow: '0 8px 32px rgba(247, 125, 17, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-8px)';
                e.currentTarget.style.borderColor = 'rgba(247, 125, 17, 0.6)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(247, 125, 17, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(247, 125, 17, 0.4)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(247, 125, 17, 0.2)';
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #f77d11 0%, #ff6b35 100%)',
                  color: '#ffffff',
                  padding: '8px 24px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: '0 4px 12px rgba(247, 125, 17, 0.4)',
                }}
              >
                🔥 Limited Time Offer
              </div>
              <h3
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '8px',
                  marginTop: '12px',
                }}
              >
                All Features
              </h3>
              <p
                style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '24px',
                  fontSize: '16px',
                  fontWeight: '500',
                }}
              >
                Everything you need to grow
              </p>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: '700',
                  color: '#f77d11',
                  marginBottom: '8px',
                }}
              >
                £59
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: '400',
                    color: 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  /month
                </span>
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '24px',
                  fontWeight: '500',
                }}
              >
                First 6 months • 14-day free trial
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '32px 0',
                  textAlign: 'left',
                }}
              >
                {[
                  'Up to 3,000 products',
                  'Up to 10 users',
                  'All premium features',
                  'Direct support',
                  'Priority assistance',
                  'Advanced analytics',
                  'Custom integrations',
                ].map((feature, index) => (
                  <li
                    key={index}
                    style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '16px',
                      fontWeight: '500',
                    }}
                  >
                    <span
                      style={{
                        color: '#f77d11',
                        marginRight: '12px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                      }}
                    >
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                style={{
                  width: '100%',
                  padding: '18px 24px',
                  background: 'linear-gradient(135deg, #f77d11 0%, #ff6b35 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: '0 4px 15px rgba(247, 125, 17, 0.4)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(247, 125, 17, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(247, 125, 17, 0.4)';
                }}
              >
                Claim Offer Now
              </button>
            </div>



          </div>

          {/* Additional Info */}
          <div
            style={{
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '16px',
            }}
          >
            <p style={{ marginBottom: '16px' }}>
              Limited time offer includes 14-day free trial • No setup fees • Cancel anytime
            </p>
            <p>
              Need help choosing? <span style={{ color: '#79d5e9', cursor: 'pointer' }}>Contact our team</span>
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

const Footer: React.FC = () => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
      `}</style>
      
      <footer
        style={{
          padding: '60px 16px 40px',
          fontFamily: "'Poppins', sans-serif",
          position: 'relative',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              radial-gradient(circle at 20% 80%, rgba(121, 213, 233, 0.03) 1px, transparent 1px),
              radial-gradient(circle at 80% 20%, rgba(247, 125, 17, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px, 120px 120px',
            pointerEvents: 'none',
          }}
        />
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '40px',
              marginBottom: '40px',
            }}
          >
            {/* Company Info */}
            <div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#ffffff',
                  marginBottom: '16px',
                  background: 'linear-gradient(135deg, #79d5e9 0%, #f77d11 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Splitfin
              </div>
              <p
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  lineHeight: '1.6',
                  marginBottom: '24px',
                  fontSize: '16px',
                }}
              >
                Streamline your business operations with our comprehensive inventory and order management platform.
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                }}
              >
                {['Twitter', 'LinkedIn', 'GitHub'].map((social, index) => (
                  <div
                    key={index}
                    style={{
                      width: '40px',
                      height: '40px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      color: 'rgba(255, 255, 255, 0.7)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(121, 213, 233, 0.2)';
                      e.currentTarget.style.color = '#79d5e9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }}
                  >
                    {social[0]}
                  </div>
                ))}
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '20px',
                }}
              >
                Product
              </h4>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                {['Features', 'Pricing', 'Integrations', 'API', 'Changelog'].map((link, index) => (
                  <li key={index} style={{ marginBottom: '12px' }}>
                    <a
                      href="#"
                      style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        textDecoration: 'none',
                        fontSize: '16px',
                        transition: 'color 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#79d5e9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                      }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '20px',
                }}
              >
                Company
              </h4>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                {['About', 'Blog', 'Careers', 'Contact', 'Press'].map((link, index) => (
                  <li key={index} style={{ marginBottom: '12px' }}>
                    <a
                      href="#"
                      style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        textDecoration: 'none',
                        fontSize: '16px',
                        transition: 'color 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#79d5e9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                      }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support Links */}
            <div>
              <h4
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '20px',
                }}
              >
                Support
              </h4>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                {['Help Center', 'Documentation', 'Community', 'Status', 'Security'].map((link, index) => (
                  <li key={index} style={{ marginBottom: '12px' }}>
                    <a
                      href="#"
                      style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        textDecoration: 'none',
                        fontSize: '16px',
                        transition: 'color 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#79d5e9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                      }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: '32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
                margin: 0,
              }}
            >
              © 2024 Splitfin. All rights reserved.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '24px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((link, index) => (
                <a
                  key={index}
                  href="#"
                  style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#79d5e9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  }}
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

const LandingPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <style>{`
        .hero-main-headline {
          font-size: clamp(48px, 7vw, 72px) !important;
          font-weight: 700 !important;
          line-height: 1.1 !important;
          color: #ffffff !important;
          margin-bottom: 32px !important;
          letter-spacing: -1px !important;
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        section {
          scroll-margin-top: 80px;
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
          60% {
            transform: translateY(-4px);
          }
        }
        
        @keyframes bounceArrow {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-3px);
          }
          60% {
            transform: translateY(-1px);
          }
        }
      `}</style>
      <div style={{ background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2a 50%, #2c3e50 100%)' }}>
        {/* Sticky navbar full-width */}
        <NavBar />
      
      {/* Section 1: hover reveal hero with header content */}
      <section id="hero">
        <HoverReveal />
      </section>
      
      {/* Bento feature grid */}
      <ScrollFadeSection delay={100} duration={1000}>
        <section id="features">
          <BentoDemo />
        </section>
      </ScrollFadeSection>

      {/* Business Categories */}
      <ScrollFadeSection delay={120} duration={1000}>
        <section id="categories">
          <BusinessCategoriesSection />
        </section>
      </ScrollFadeSection>

      {/* CTA Section */}
      <ScrollFadeSection delay={150} duration={1000}>
        <section id="cta">
          <CTASection onOpenModal={openModal} />
        </section>
      </ScrollFadeSection>
      
      {/* Blog Section */}
      <ScrollFadeSection delay={150} duration={1000}>
        <section id="blog">
          <BlogSection />
        </section>
      </ScrollFadeSection>
      
      {/* Pricing Section */}
      <ScrollFadeSection delay={100} duration={1000}>
        <section id="pricing">
          <PricingSection />
        </section>
      </ScrollFadeSection>
      
      {/* Footer */}
      <ScrollFadeSection delay={100} duration={800}>
        <footer id="footer">
          <Footer />
        </footer>
      </ScrollFadeSection>
      
        {/* Contact Form Modal */}
        <ContactFormModal isOpen={isModalOpen} onClose={closeModal} />
      </div>
    </>
  );
};

export default LandingPage;
