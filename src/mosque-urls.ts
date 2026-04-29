import type { MosqueConfig } from "./types";

export const mosqueUrls: MosqueConfig[] = [
  {
    name: "Al Hira Centre",
    slug: "al-hira-centre",
    url: "https://www.inspirefm.org/view-prayer-timings/al-hira-centre?refkey=H69pKMxtH1Kztwe",
    wpUrl: "https://alhiraluton.org.uk/wp-json/dpt/v1/prayertime?filter=month",
  },
  {
    name: "Al Furqan",
    slug: "al-furqan",
    masjidBoxApi:
      "https://api.masjidbox.com/1.0/masjidbox/landing/athany/al-furqan-1721239006128",
  },
  {
    name: "Jalalabad Jamia Masjid",
    slug: "jalalabad-jamia-masjid",
    url: "https://www.inspirefm.org/view-prayer-timings/jalalabad-jamia-masjid?refkey=sUwxYOInm6JyotH",
    wpUrl:
      "https://www.jalalabadmasjid.org.uk/wp-json/dpt/v1/prayertime?filter=month",
  },
  {
    name: "Al Jalal Masjid",
    slug: "al-jalal-masjid",
    url: "https://www.inspirefm.org/view-prayer-timings/al-jalal-masjid?refkey=j8PEK3D8ML97xM3",
    wpUrl: "https://aljalalmasjid.org/wp-json/dpt/v1/prayertime?filter=month",
  },
  {
    name: "Bait Ul Abrar Jamia Masjid",
    slug: "bait-ul-abrar-jamia-masjid",
    url: "https://www.inspirefm.org/view-prayer-timings/bait-ul-abrar-jamia-masjid?refkey=dkuKAhYnSNXGvqn",
    websiteUrl: "https://jamialuton.org/",
  },
  {
    name: "Bury Park Jamia Masjid",
    slug: "bury-park-jamia-masjid",
    url: "https://www.inspirefm.org/view-prayer-timings/bury-park-jamia-masjid?refkey=G81ehjaJ7fP5ih6",
    supabaseUrl:
      "https://xagqlgbbgfwhmmaeeizz.supabase.co/rest/v1/prayer_times?select=*&apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhZ3FsZ2JiZ2Z3aG1tYWVlaXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MDcyNTksImV4cCI6MjA1OTM4MzI1OX0.c2dJpFVJKnn7am8EPisX1dHsity46QDcYkRXsBJzYR4",
    websiteUrl: "https://www.buryparkmasjid.co.uk/mobile",
  },
  {
    name: "Faizan-e-Mushkil Kusha",
    slug: "faizan-e-mushkil-kusha",
    url: "https://www.inspirefm.org/view-prayer-timings/faizan-e-mushkil-kusha?refkey=vCoQLkUuXU5yO09",
    websiteUrl: "https://www.airmyprayer.co.uk/ltn-1012",
  },
  {
    name: "Hockwell Ring Masjid",
    slug: "hockwell-ring-masjid",
    url: "https://www.inspirefm.org/view-prayer-timings/hockwell-ring-masjid?refkey=5ykxLZeGUjOoh8U",
    wpUrl:
      "https://hockwellringmasjid.org.uk/wp-json/dpt/v1/prayertime?filter=month",
  },
  {
    name: "Farley Hill Masjid",
    slug: "farley-hill-masjid",
    url: "https://www.inspirefm.org/view-prayer-timings/farley-hill-masjid?refkey=8H5VvyjFIruMyiw",
    googleSheetCsvUrl:
      "https://docs.google.com/spreadsheets/d/1U5f3Qd08qwnRkr7iecDzKgpyQz63zWFiS-V2Sv_ml2c/export?format=csv&gid=1811739189",
  },
  {
    name: "Jamia Islamia Ghousia Trust",
    slug: "jamia-islamia-ghousia-trust",
    url: "https://www.inspirefm.org/view-prayer-timings/jamia-islamia-ghousia-trust?refkey=SMnmK9CWUuPdaze",
  },
  {
    name: "Jamia Al-Akbaria",
    slug: "jamia-al-akbaria",
    url: "https://www.inspirefm.org/view-prayer-timings/jamia-al-akbaria?refkey=z9aSnU7xoneCiCW",
    googleSheetCsvUrl:
      "https://docs.google.com/spreadsheets/d/1U5f3Qd08qwnRkr7iecDzKgpyQz63zWFiS-V2Sv_ml2c/export?format=csv&gid=1358327477",
  },
  {
    name: "Leagrave Hall Masjid",
    slug: "leagrave-hall-masjid",
    url: "https://www.inspirefm.org/view-prayer-timings/leagrave-hall-masjid?refkey=NoEtlOSFgfnWqKe",
    wpUrl:
      "https://leagravehallmasjid.com/wp-json/dpt/v1/prayertime?filter=month",
  },
  {
    name: "Lewsey Community Centre",
    slug: "lewsey-community-centre",
    url: "https://www.inspirefm.org/view-prayer-timings/lewsey-community-centre?refkey=Rwc3aJBphwlkNbd",
  },
  {
    name: "Madinah Masjid",
    slug: "madinah-masjid",
    url: "https://www.inspirefm.org/view-prayer-timings/madinah-masjid?refkey=Mg7JBd0Ntm3EX3f",
    websiteUrl: "https://madinah-masjid.org.uk/",
  },
  {
    name: "Luton Central Masjid",
    slug: "luton-central-masjid",
    url: "https://www.inspirefm.org/view-prayer-timings/luton-central-masjid?refkey=W9DeMtrs5IOnSKe",
    masjidBoxApi: "https://masjidbox.com/prayer-times/luton-central-mosque",
  },
  {
    name: "Kokni Masjid",
    slug: "kokni-masjid",
    url: "https://www.inspirefm.org/view-prayer-timings/kokni-masjid?refkey=e31KjldaiV1piny",
    wpUrl:
      "https://masjid.kokniluton.co.uk/wp-json/dpt/v1/prayertime?filter=month",
  },
  {
    name: "Masjid Al-Huda",
    slug: "masjid-al-huda",
    url: "https://www.inspirefm.org/view-prayer-timings/masjid-al-huda?refkey=Zca8cRxIOQBAucL",
  },
  {
    name: "Masjid As-Sunnah",
    slug: "masjid-as-sunnah",
    url: "https://www.inspirefm.org/view-prayer-timings/masjid-as-sunnah?refkey=4k5QdbC1Z1DVB9e",
    wpUrl:
      "https://masjidussunnah.co.uk/wp-json/dpt/v1/prayertime?filter=month",
  },
  {
    name: "Masjid Bilal",
    slug: "masjid-bilal",
    wpUrl: "https://www.masjidbilal.uk/wp-json/dpt/v1/prayertime?filter=month",
  },
  {
    name: "Masjid Irshad",
    slug: "masjid-irshad",
    url: "https://www.inspirefm.org/view-prayer-timings/masjid-irshad?refkey=CjpkjmLW4S6vaTj",
    websiteUrl: "https://masjidirshad.co.uk",
  },
  {
    name: "Masjid Suffa-Tul-Islam",
    slug: "masjid-suffa-tul-islam",
    url: "https://www.inspirefm.org/view-prayer-timings/masjid-suffa-tul-islam?refkey=wXzyqvR4jtutql3",
    masjidBoxApi:
      "https://api.masjidbox.com/1.0/masjidbox/landing/athany/suffa-tul-islam-luton",
  },
  {
    name: "Masjid-e-Ali",
    slug: "masjid-e-ali",
    url: "https://www.inspirefm.org/view-prayer-timings/masjid-e-ali?refkey=1YUVYu1jnwl6Ugr",
    websiteUrl: "https://www.masjideali.org/prayer-times",
  },
  {
    name: "Masjid-e-Noor",
    slug: "masjid-e-noor",
    url: "https://www.inspirefm.org/view-prayer-timings/masjid-e-noor?refkey=jmwgz9T4vEaeLPq",
    wpUrl:
      "https://www.masjidnoorluton.com/wp-json/dpt/v1/prayertime?filter=month",
  },
  {
    name: "Saints Area Masjid",
    slug: "saints-area-masjid",
    wpUrl:
      "https://saintsareamasjid.com/wp-json/dpt/v1/prayertime?filter=month",
  },
  {
    name: "Yusuf Hall",
    slug: "yusuf-hall",
    url: "https://www.inspirefm.org/view-prayer-timings/yusuf-hall?refkey=4oT6kawaV6OA9oj",
  },
  {
    name: "Turkish Community Assoc",
    slug: "turkish-community-assoc",
    url: "https://www.inspirefm.org/view-prayer-timings/turkish-community-assoc?refkey=NWLVMpvbQxaPYIs",
  },
  {
    name: "Zakariya Masjid",
    slug: "zakariya-masjid",
    url: "https://www.inspirefm.org/view-prayer-timings/zakariya-masjid?refkey=6NHPZpjAgFaicdr",
    wpUrl:
      "http://zakariyamasjid.org.uk/wp-json/dpt/v1/prayertime?filter=month",
  },
  {
    name: "Zuhri Academy",
    slug: "zuhri-academy",
    url: "https://www.inspirefm.org/view-prayer-timings/zuhri-academy?refkey=isRqMqaSStYbjcp",
    wpUrl: "https://zuhriacademy.com/wp-json/dpt/v1/prayertime?filter=month",
  },
  {
    name: "Luton Islamic Centre",
    slug: "luton-islamic-centre",
    url: "https://www.inspirefm.org/view-prayer-timings/luton-islamic-centre?refkey=OWCIb9HCIwj74jN",
    mawaqitUrl:
      "https://mawaqit.net/en/w/luton-islamic-centre-luton-lu1-1he-united-kingdom?showOnly5PrayerTimes=1",
  },
  {
    name: "Dunstable Masjid",
    slug: "dunstable-masjid",
    wpUrl:
      "https://dunstablemasjid.org.uk/wp-json/dpt/v1/prayertime?filter=month",
  },
];

