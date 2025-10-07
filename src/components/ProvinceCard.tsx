import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Province } from '../types/province';
import { useTheme } from '../context/ThemeContext';

interface ProvinceCardProps {
  province: Province;
}

export default function ProvinceCard({ province }: ProvinceCardProps) {
  const { theme } = useTheme();

  return (
    <Link
      to={`/province/${province.id}`}
      className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105"
    >
      <div className="aspect-w-16 aspect-h-9">
        <img
          src={theme === 'dark' ? province.darkImage : province.image}
          alt={province.name}
          className="w-full h-40 sm:h-48 object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      <div className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors line-clamp-2">
          {province.name}
        </h3>
        <p className="mt-2 text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
          {province.description}
        </p>
        <div className="mt-3 sm:mt-4 flex items-center text-purple-500 dark:text-purple-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
          <span className="text-sm sm:text-base font-medium">Explore pathways</span>
          <ChevronRight className="ml-1 h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </Link>
  );
}