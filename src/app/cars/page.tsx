import VehicleBrowser from "@/components/splitlease/VehicleBrowser";
import Header from "@/components/splitlease/Header";
import Footer from "@/components/splitlease/Footer";
import VehicleChatWidget from "@/components/splitlease/VehicleChatWidget";

export default function CarsPage() {
  return (
    <>
      <Header />
      <VehicleBrowser vehicleType="car" />
      <Footer />
      <VehicleChatWidget />
    </>
  );
}
