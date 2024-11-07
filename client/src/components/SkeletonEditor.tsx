const SkeletonEditor = () => {
  return (
    <div className="mt-5 space-y-2"> {/* more margin than heading to align with actual content */}
      <div className="h-4 bg-gray-300 rounded w-full animate-pulse"></div>
      <div className="h-4 bg-gray-300 rounded w-full animate-pulse"></div>
      <div className="h-4 bg-gray-300 rounded w-full animate-pulse"></div>
      <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div>
    </div>
  );
};

export default SkeletonEditor;
