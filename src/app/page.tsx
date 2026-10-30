import Nav from "@/components/marketing/nav";
import Hero from "@/components/marketing/hero";
import TickerBand from "@/components/marketing/ticker-band";
import CommandCenter from "@/components/marketing/command-center";
import ProductGallery from "@/components/marketing/product-gallery";
import LiveDemo from "@/components/marketing/live-demo";
import PrStudio from "@/components/marketing/pr-studio";
import GrowthStats from "@/components/marketing/growth-stats";
import Roadmap from "@/components/marketing/roadmap";
import FinalCta from "@/components/marketing/final-cta";
import EasterEgg from "@/components/marketing/easter-egg";
import Footer from "@/components/marketing/footer";
import WelcomeOverlay from "@/components/marketing/welcome-overlay";

export default function Page() {
  return (
    <div className="industrial flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">
        <Hero />
        <TickerBand />
        <CommandCenter />
        <ProductGallery />
        <LiveDemo />
        <PrStudio />
        <GrowthStats />
        <Roadmap />
        <FinalCta />
        <EasterEgg />
      </main>
      <Footer />
      <WelcomeOverlay />
    </div>
  );
}
