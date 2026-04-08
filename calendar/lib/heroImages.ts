export type HeroImage = {
  src: string;
  alt: string;
};

const HERO_IMAGES_BY_MONTH: HeroImage[] = [
  { src: "/hero/nature-01.jpg", alt: "Snowy mountain landscape" }, // Jan
  { src: "/hero/nature-02.jpg", alt: "Snowy pine trees and mountains" }, // Feb
  { src: "/hero/nature-03.jpg", alt: "Sunlit spring forest" }, // Mar
  { src: "/hero/nature-04.jpg", alt: "Spring flowers near trees" }, // Apr
  { src: "/hero/nature-05.jpg", alt: "Green meadow and trees" }, // May
  { src: "/hero/nature-06.jpg", alt: "Golden-hour sea and clouds" }, // Jun
  { src: "/hero/nature-07.jpg", alt: "Palm silhouettes at sunset" }, // Jul
  { src: "/hero/nature-08.jpg", alt: "Lakeside forest at golden hour" }, // Aug
  { src: "/hero/nature-09.jpg", alt: "Mountain lake in early autumn" }, // Sep
  { src: "/hero/nature-10.jpg", alt: "Autumn forest canopy with mist" }, // Oct
  { src: "/hero/nature-11.jpg", alt: "Misty forest landscape" }, // Nov
  { src: "/hero/nature-12.jpg", alt: "Winter pines covered in snow" }, // Dec
];

export function getHeroForMonth(monthIndex: number): HeroImage {
  const safeIndex = Number.isFinite(monthIndex) ? Math.min(11, Math.max(0, monthIndex)) : 0;
  return HERO_IMAGES_BY_MONTH[safeIndex] ?? HERO_IMAGES_BY_MONTH[0]!;
}

