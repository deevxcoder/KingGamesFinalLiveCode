import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Cricket-related promo images from Unsplash
const promoImages = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=300&q=80",
    alt: "Cricket Stadium - Special Offer Bonus"
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1595604501726-7e1ba58e8c16?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=300&q=80",
    alt: "Cricket Match - Daily Cashback"
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1600250624674-fb4969825db7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=300&q=80",
    alt: "Cricket Bat and Ball - VIP Rewards"
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
                <div className="relative w-full h-full">
                  <img 
                    src={image.url} 
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
                    <div className="pl-8 max-w-md">
                      <h3 className="text-white text-lg md:text-xl font-bold mb-2">
                        {image.alt.split(' - ')[1]}
                      </h3>
                      <p className="text-white/90 text-sm md:text-base">
                        {image.id === 1 && "Get 50% bonus on your first deposit today!"}
                        {image.id === 2 && "Earn 10% cashback on all your cricket bets daily!"}
                        {image.id === 3 && "Join our VIP program for exclusive rewards and bonuses!"}
                      </p>
                    </div>
                  </div>
                </div>
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