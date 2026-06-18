import React from 'react';
import { Loader } from 'lucide-react';

export default function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <Loader className="animate-spin mr-2" size={22} />
      <span className="text-sm">Loading page...</span>
    </div>
  );
}
