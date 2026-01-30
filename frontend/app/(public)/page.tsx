import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { WishChatBot } from '@/components/wish';

export default function HomePage() {
  return (
    <div className="bg-white">
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Welcome to{' '}
            <span className="text-blue-600">Mido Learning</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Your personalized learning platform. Start your journey today and unlock your potential
            with our comprehensive courses and interactive learning experience.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/about">
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Why Choose Mido Learning?
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-lg bg-white p-8 shadow-sm">
              <div className="mb-4 text-3xl">📚</div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                Comprehensive Courses
              </h3>
              <p className="text-gray-600">
                Access a wide range of courses designed to help you achieve your learning goals.
              </p>
            </div>
            <div className="rounded-lg bg-white p-8 shadow-sm">
              <div className="mb-4 text-3xl">🎯</div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                Personalized Learning
              </h3>
              <p className="text-gray-600">
                Get a customized learning path tailored to your skills and interests.
              </p>
            </div>
            <div className="rounded-lg bg-white p-8 shadow-sm">
              <div className="mb-4 text-3xl">🏆</div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                Track Progress
              </h3>
              <p className="text-gray-600">
                Monitor your progress and celebrate your achievements along the way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Wish ChatBot Section */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-3xl font-bold text-gray-900">
            Share Your Learning Wish
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-lg text-gray-600">
            Tell us what you want to learn, and we will work hard to create the perfect course for
            you!
          </p>
          <WishChatBot />
        </div>
      </section>
    </div>
  );
}
