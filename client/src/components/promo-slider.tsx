import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Sample promo images
const promoImages = [
  {
    id: 1,
    url: "https://placehold.co/1200x300/1e293b/38bdf8/png?text=Special+Offer+Bonus",
    alt: "Special Offer Bonus"
  },
  {
    id: 2,
    url: "https://placehold.co/1200x300/1e293b/4ade80/png?text=Daily+Cashback",
    alt: "Daily Cashback"
  },
  {
    id: 3,
    url: "https://placehold.co/1200x300/1e293b/a78bfa/png?text=VIP+Rewards",
    alt: "VIP Rewards"
  }
];

export default function PromoSlider() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Auto-slide every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === promoImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const goToPrevious = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? promoImages.length - 1 : prevIndex - 1
    );
  };
  
  const goToNext = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === promoImages.length - 1 ? 0 : prevIndex + 1
    );
  };
  
  return (
    <Card className="w-full bg-slate-900/50 border-slate-800 overflow-hidden relative">
      <CardContent className="p-0 relative">
        {/* Image container with transition */}
        <div className="relative overflow-hidden w-full h-[180px]">
          <div 
            className="flex transition-transform duration-500 ease-in-out h-full"
            style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
          >
            {promoImages.map((image) => (
              <div key={image.id} className="w-full h-full flex-shrink-0">
                <img 
                  src={image.url} 
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Navigation dots */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-2">
          {promoImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentImageIndex ? "bg-white" : "bg-white/40"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}