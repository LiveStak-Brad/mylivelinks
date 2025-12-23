'use client';

export default function LiveRoomSimple() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <h1 className="text-4xl font-bold mb-4">Live Room Test</h1>
      <p className="text-xl">If you see this, the page is working!</p>
      <div className="mt-8 grid grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">Slot {i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}





