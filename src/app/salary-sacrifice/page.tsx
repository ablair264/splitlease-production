import { Metadata } from "next";
import SalarySacrificeLanding from "@/components/splitlease/SalarySacrificeLanding";

export const metadata: Metadata = {
  title: "EV Salary Sacrifice | SplitLease - Save Up to 40% on Electric Cars",
  description:
    "Zero cost to employers, up to 40% savings for employees. The EV salary sacrifice scheme that puts businesses and their people first. Insurance, maintenance, and road tax all included.",
  keywords: [
    "salary sacrifice",
    "electric car",
    "EV leasing",
    "company car",
    "employee benefits",
    "tax savings",
    "electric vehicle",
    "green fleet",
  ],
  openGraph: {
    title: "EV Salary Sacrifice | SplitLease",
    description:
      "Like the cycle-to-work scheme, but for electric cars. Zero cost to employers, up to 40% savings for employees.",
    type: "website",
    url: "https://splitlease.co.uk/salary-sacrifice",
  },
};

export default function SalarySacrificePage() {
  return <SalarySacrificeLanding />;
}
