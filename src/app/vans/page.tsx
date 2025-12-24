import VehicleBrowser from "@/components/splitlease/VehicleBrowser";
import Header from "@/components/splitlease/Header";
import Footer from "@/components/splitlease/Footer";
import VehicleChatWidget from "@/components/splitlease/VehicleChatWidget";

export default function VansPage() {
  return (
    <>
      <Header />
      <VehicleBrowser vehicleType="van" />
      <Footer />
      <VehicleChatWidget />
    </>
  );
}
