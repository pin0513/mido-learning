export default function AboutPage() {
  return (
    <div className="bg-white py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900">About Mido Learning</h1>

        <div className="mt-8 space-y-6 text-lg text-gray-600">
          <p>
            Mido Learning is a modern learning platform designed to help individuals achieve their
            educational goals through personalized learning experiences.
          </p>

          <p>
            Our mission is to make quality education accessible to everyone, anywhere, anytime.
            We believe that learning should be engaging, interactive, and tailored to each
            individual&apos;s needs and pace.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-gray-900">Our Values</h2>

          <ul className="list-inside list-disc space-y-2">
            <li>
              <strong>Accessibility:</strong> Education should be available to everyone regardless
              of background or location.
            </li>
            <li>
              <strong>Quality:</strong> We provide high-quality content created by experts in
              their fields.
            </li>
            <li>
              <strong>Innovation:</strong> We continuously improve our platform using the latest
              technologies.
            </li>
            <li>
              <strong>Community:</strong> Learning is better together. We foster a supportive
              community of learners.
            </li>
          </ul>

          <h2 className="mt-12 text-2xl font-bold text-gray-900">Contact Us</h2>

          <p>
            Have questions or feedback? We&apos;d love to hear from you. Reach out to us at{' '}
            <a href="mailto:hello@midolearning.com" className="text-blue-600 hover:underline">
              hello@midolearning.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
