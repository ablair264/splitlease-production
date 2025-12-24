"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/admin/leads");
        router.refresh();
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-gradient-bg min-h-screen min-h-dvh flex items-center justify-center relative overflow-hidden p-4 md:p-6">
      {/* Base gradient background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2a 50%, #2c3e50 100%)'
        }}
      />

      {/* Animated gradient overlay */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: `linear-gradient(
            45deg,
            rgba(15, 20, 25, 0.9) 0%,
            rgba(121, 213, 233, 0.15) 20%,
            rgba(26, 31, 42, 0.95) 40%,
            rgba(77, 174, 172, 0.1) 60%,
            rgba(44, 62, 80, 0.9) 80%,
            rgba(121, 213, 233, 0.1) 100%
          )`,
          backgroundSize: '300% 300%',
          animation: 'gradientShift 15s ease infinite'
        }}
      />

      {/* Gradient pulse overlay */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background: `radial-gradient(
            ellipse at 30% 40%,
            rgba(121, 213, 233, 0.12) 0%,
            transparent 40%
          ),
          radial-gradient(
            ellipse at 70% 60%,
            rgba(77, 174, 172, 0.08) 0%,
            transparent 50%
          )`,
          animation: 'gradientPulse 20s ease-in-out infinite'
        }}
      />

      {/* Floating accent element */}
      <div
        className="floating-accent absolute top-[20%] right-[15%] w-[200px] h-[200px] md:w-[300px] md:h-[300px] rounded-full z-[3] pointer-events-none"
        style={{
          background: `radial-gradient(
            circle,
            rgba(121, 213, 233, 0.1) 0%,
            rgba(121, 213, 233, 0.05) 50%,
            transparent 100%
          )`,
          filter: 'blur(40px)',
          animation: 'gentleFloat 20s ease-in-out infinite'
        }}
      />

      {/* Login container */}
      <div className="relative z-[100] w-full max-w-[400px] mx-auto">
        {/* Login card */}
        <div
          className="relative rounded-2xl md:rounded-3xl p-6 md:p-10 w-full border-2 backdrop-blur-xl"
          style={{
            background: 'rgba(26, 31, 42, 0.95)',
            borderColor: 'rgba(121, 213, 233, 0.3)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(121, 213, 233, 0.15)'
          }}
        >
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <div className="flex items-center justify-center mb-4">
              <h1
                className="text-2xl md:text-3xl font-bold"
                style={{ color: '#79d5e9' }}
              >
                Broker Platform
              </h1>
            </div>
            <p className="text-sm md:text-base text-gray-300 font-medium opacity-90">
              Access your dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-1 w-full">
            {/* Error message */}
            {error && (
              <div
                className="flex items-center gap-3 p-3 md:p-4 rounded-xl mb-4 backdrop-blur-lg"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  animation: 'errorSlideIn 0.3s ease-out'
                }}
              >
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span className="text-red-500 text-xs md:text-sm font-medium">{error}</span>
              </div>
            )}

            {/* Email field */}
            <div className="flex flex-col gap-2 mb-4">
              <label
                htmlFor="email"
                className="text-xs md:text-sm font-semibold text-white pl-1"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={isLoading}
                className="w-full px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-base font-medium text-white placeholder-gray-400 outline-none transition-all duration-300 min-h-[48px]"
                style={{
                  background: 'rgba(31, 41, 55, 0.8)',
                  border: '2px solid transparent',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#79d5e9';
                  e.target.style.boxShadow = '0 0 0 3px rgba(121, 213, 233, 0.1), 0 8px 25px rgba(0, 0, 0, 0.15)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'transparent';
                  e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  e.target.style.transform = 'translateY(0)';
                }}
              />
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-2 mb-4">
              <label
                htmlFor="password"
                className="text-xs md:text-sm font-semibold text-white pl-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading}
                className="w-full px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-base font-medium text-white placeholder-gray-400 outline-none transition-all duration-300 min-h-[48px]"
                style={{
                  background: 'rgba(31, 41, 55, 0.8)',
                  border: '2px solid transparent',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#79d5e9';
                  e.target.style.boxShadow = '0 0 0 3px rgba(121, 213, 233, 0.1), 0 8px 25px rgba(0, 0, 0, 0.15)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'transparent';
                  e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  e.target.style.transform = 'translateY(0)';
                }}
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="relative flex items-center justify-center gap-2 md:gap-3 w-full px-6 md:px-8 py-4 md:py-5 rounded-xl md:rounded-2xl text-sm md:text-base font-bold cursor-pointer transition-all duration-300 mt-4 min-h-[48px] overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #79d5e9 0%, #6bc7db 100%)',
                color: '#0f1419',
                boxShadow: '0 8px 25px rgba(121, 213, 233, 0.15)'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 15px 35px rgba(121, 213, 233, 0.4)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #6bc7db 0%, #89dce6 100%)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(121, 213, 233, 0.15)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #79d5e9 0%, #6bc7db 100%)';
              }}
            >
              {/* Shine effect */}
              <span
                className="absolute top-0 left-[-100%] w-full h-full transition-all duration-500 group-hover:left-[100%]"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)'
                }}
              />

              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 md:mt-8 text-center">
            <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
              Need help? Contact your administrator for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
