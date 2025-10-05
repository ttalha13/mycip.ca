import { useParams, Link } from 'react-router-dom';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { provinces } from '../data/provinces';
import { useTheme } from '../context/ThemeContext';

export default function ProvincePage() {
  const { id } = useParams<{ id: string }>();
  const province = provinces.find((p) => p.id === id);
  const { theme } = useTheme();

  if (!province) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Province not found</h2>
          <Link to="/" className="mt-4 text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300">
            Return to homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          to="/"
          className="inline-flex items-center text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Return to provinces
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="h-64 relative">
            <img
              src={theme === 'dark' ? province.darkImage : province.image}
              alt={province.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
              <h1 className="text-4xl font-bold text-white">{province.name}</h1>
            </div>
          </div>

          <div className="p-8">
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">{province.description}</p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Available Immigration Pathways
            </h2>

            <div className="space-y-6">
              {province.pathways.map((pathway, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {pathway.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{pathway.description}</p>
                  <a
                    href={pathway.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300"
                  >
                    Visit official website
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Nunavut Information Section - Available on all province pages */}
        <div className="mt-12">
          <section className="bg-blue-50 dark:bg-blue-900/20 text-gray-800 dark:text-gray-200 p-6 rounded-2xl shadow-sm leading-relaxed space-y-6 border border-blue-200 dark:border-blue-800">
            <h2 className="text-3xl font-bold text-blue-700 dark:text-blue-400">🇨🇦 Nunavut Immigration Guide</h2>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4">🏔 Overview</h3>
              <p>
                Nunavut is Canada's newest and northernmost territory, known for its stunning Arctic landscapes and rich Inuit culture.
                However, <strong>Nunavut does not have its own Provincial Nominee Program (PNP)</strong> — unlike other provinces and territories.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4">🚫 No Provincial Nominee Program (PNP)</h3>
              <p>
                Nunavut currently <strong>does not operate a PNP</strong>, which means you cannot apply directly for immigration through a Nunavut-specific program.
                Instead, immigration to Nunavut is managed through <strong>federal immigration pathways</strong>.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4">🛣️ Federal Immigration Pathways to Nunavut</h3>
              <p>Even without a PNP, there are several ways you can immigrate and work in Nunavut:</p>

              <h4 className="text-lg font-semibold mt-2">1. Express Entry (Federal Program)</h4>
              <ul className="list-disc ml-6">
                <li>Federal Skilled Worker Program (FSWP)</li>
                <li>Federal Skilled Trades Program (FSTP)</li>
                <li>Canadian Experience Class (CEC)</li>
              </ul>
              <p>
                Once approved for permanent residence, you are <strong>free to settle anywhere in Canada</strong>, including Nunavut.
              </p>

              <h4 className="text-lg font-semibold mt-4">2. Employer Sponsored Work Permits</h4>
              <p>
                If you receive a <strong>valid job offer from a Nunavut employer</strong>, you may be eligible for a temporary work permit:
              </p>
              <ul className="list-disc ml-6">
                <li>LMIA-based (Labour Market Impact Assessment)</li>
                <li>LMIA-exempt under certain programs</li>
              </ul>
              <p>Later, you can apply for permanent residency through a federal stream.</p>

              <h4 className="text-lg font-semibold mt-4">3. Family Sponsorship & Refugee Programs</h4>
              <p>Nunavut also welcomes newcomers through:</p>
              <ul className="list-disc ml-6">
                <li>Family Sponsorship (if you have eligible relatives in Canada)</li>
                <li>Refugee or humanitarian programs</li>
              </ul>
              <p>These are <strong>federal programs</strong>, so they apply across all provinces and territories — Nunavut included.</p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4">🏗️ Major Industries in Nunavut</h3>
              <ul className="list-disc ml-6">
                <li>Mining & Natural Resources</li>
                <li>Construction & Skilled Trades</li>
                <li>Public Administration</li>
                <li>Healthcare & Education</li>
              </ul>
              <p>Employers in these sectors occasionally hire <strong>foreign workers</strong> to fill high-demand roles.</p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4">⚠️ Important Notes</h3>
              <ul className="list-disc ml-6">
                <li><strong>Population:</strong> ~40,000 people</li>
                <li><strong>Job Market:</strong> Limited due to small local economy</li>
                <li><strong>Cost of Living:</strong> High (especially for groceries and housing)</li>
                <li><strong>Climate:</strong> Arctic – long winters, short summers</li>
              </ul>
              <p>
                While Nunavut offers unique opportunities and experiences, it's best suited for those prepared for <strong>remote living and extreme conditions</strong>.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4">💡 Tip: Finding Nunavut Employers</h3>
              <p>
                You can find verified Nunavut employers who hire foreign workers on Canada's official{' '}
                <a 
                  href="https://www.jobbank.gc.ca/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Job Bank
                </a>.
              </p>
              <p>Use filters like:</p>
              <blockquote className="border-l-4 border-blue-400 pl-4 italic mt-2">
                Location: Nunavut<br />
                Job Type: LMIA Approved or Open to International Applicants
              </blockquote>
            </section>
          </section>
        </div>
      </div>
    </div>
  );
}