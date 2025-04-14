import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import useEmblaCarousel from 'embla-carousel-react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SliderItem {
  id: string;
  title: string;
  description: string;
  backgroundImage: string;
  buttonText: string;
  buttonLink: string;
}

interface HeroSliderProps {
  slides: SliderItem[];
  autoPlayInterval?: number;
}

export default function HeroSlider({ 
  slides, 
  autoPlayInterval = 5000 
}: HeroSliderProps) {
  const [_, setLocation] = useLocation();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  
  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-play functionality
  useEffect(() => {
    if (!emblaApi) return;
    
    const intervalId = setInterval(() => {
      emblaApi.scrollNext();
    }, autoPlayInterval);

    // Clear interval when user interacts with the carousel
    const onInteractionStarted = () => {
      clearInterval(intervalId);
    };
    
    emblaApi.on('pointerDown', onInteractionStarted);
    
    return () => {
      clearInterval(intervalId);
      if (emblaApi) {
        emblaApi.off('pointerDown', onInteractionStarted);
      }
    };
  }, [emblaApi, autoPlayInterval]);

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex h-[400px] sm:h-[500px] md:h-[600px]">
          {slides.map((slide, index) => (
            <div 
              key={slide.id} 
              className="flex-[0_0_100%] min-w-0 relative"
            >
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ 
                  background: slide.backgroundImage.startsWith('linear-gradient') 
                    ? slide.backgroundImage 
                    : `url(${slide.backgroundImage})` 
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/40 flex items-center">
                  <div className="container mx-auto px-4 md:px-8">
                    <div className="max-w-2xl">
                      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
                        {slide.title}
                      </h1>
                      <p className="text-white/90 text-lg sm:text-xl mb-6">
                        {slide.description}
                      </p>
                      <Button 
                        className="px-8 py-6 text-lg bg-gradient-to-r from-primary to-blue-400 hover:from-primary/90 hover:to-blue-600"
                        onClick={() => setLocation(slide.buttonLink)}
                      >
                        {slide.buttonText}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Navigation buttons */}
      <button 
        onClick={scrollPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-all"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button 
        onClick={scrollNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-all"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
      
      {/* Dots indicators */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <div className="flex space-x-2">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === selectedIndex
                  ? 'bg-white scale-100'
                  : 'bg-white/50 scale-75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}