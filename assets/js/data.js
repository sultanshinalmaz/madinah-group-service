/* ==========================================================================
   MADINAH GROUP — весь контент приложения
   Правьте только этот файл: цены, статусы, тексты, контакты.
   Код трогать не нужно.
   ========================================================================== */

window.DATA = {

  /* --- Кто сдаёт ------------------------------------------------------- */
  brand: {
    name:     { ru: 'Madinah Group', uz: 'Madinah Group', en: 'Madinah Group' },
    tagline:  { ru: 'Жильё · визы · туры · авто', uz: 'Uy-joy · viza · tur · avto', en: 'Homes · visas · tours · cars' },
    realtor:  { ru: 'Абдуллах Рахимов',  uz: 'Abdullah Rahimov', en: 'Abdullah Rakhimov' },
    about: {
      ru: 'Подбираю жильё в Медине для братьев и сестёр из Узбекистана, России и СНГ. ' +
          'Показываю квартиру лично, перевожу разговор с владельцем, проверяю договор ' +
          'и помогаю договориться с владельцем.',
      uz: 'Madinada O‘zbekiston, Rossiya va MDH dan kelgan birodar va opa-singillarga ' +
          'uy tanlab beraman. Kvartirani o‘zim ko‘rsataman, uy egasi bilan gaplashib ' +
          'tarjima qilaman, shartnomani tekshiraman va uy egasi bilan kelishishga yordam beraman.',
      en: 'I help brothers and sisters from Uzbekistan, Russia and the CIS find a home in Madinah. ' +
          'I show every apartment in person, translate the conversation with the owner, check the contract ' +
          'and help you agree with the owner.'
    },
    channel: 'https://t.me/madinah_rent',
    channelName: '@madinah_rent'
  },

  /* --- Контакты. У сестёр отдельный ник: заявки и вопросы идут туда ----- */
  contacts: {
    brothers: { tg: 'RakhimovAbdullah', phone: '+966506672436', wa: '966506672436' },
    sisters:  { tg: 'AmdinMadinahGR',   phone: '',              wa: '' },
    instagram: '',
    hours: {
      ru: 'Работаем круглосуточно, без выходных',
      uz: 'Kun-u tun, dam olish kunlarisiz ishlaymiz', en: 'Open 24/7, every day'
    }
  },

  /* --- Настройки заявки ------------------------------------------------- */
  booking: {
    // 'auto' — если приложение открыто с нашего сервера (bot/server.js), заявки, статусы
    // и новые квартиры идут через него. На обычном хостинге работает без сервера.
    api: 'auto'
  },

  /* --- Районы Медины ---------------------------------------------------- */
  districts: {
    'fath':       { lat: 24.47957, lng: 39.59550, approx: false, ru: 'Аль-Фатх',             uz: 'Al Fath', en: 'Al-Fath',      haram: { ru: '1,2 км', uz: '1,2 km', en: '1.2 km' },
      note: { ru: 'Жилой район в 15–20 минутах пешком от Харама', uz: 'Haramdan piyoda 15–20 daqiqalik turar-joy hududi', en: 'Residential area, 15–20 minutes\' walk from the Haram' } },
    'suqiya':     { lat: 24.46347, lng: 39.59763, approx: false, ru: 'Аль-Сукия',            uz: 'Al Suqiya', en: 'Al-Suqiya',    haram: { ru: '1 км', uz: '1 km', en: '1 km' },
      note: { ru: 'Ближний к Хараму район, 8–10 минут пешком', uz: 'Haramga yaqin hudud, piyoda 8–10 daqiqa', en: 'Close to the Haram, 8–10 minutes on foot' } },
    'tariq-quba': { lat: 24.44550, lng: 39.61600, approx: true, ru: 'Тарик Куба',           uz: 'Tariq Quba', en: 'Tariq Quba',   haram: { ru: '10–15 мин пешком', uz: 'piyoda 10–15 daqiqa', en: '10–15 min walk' },
      note: { ru: 'Дорога между Харамом и мечетью Куба, рядом бесплатный марказ арабского языка', uz: 'Haram bilan Quba masjidi orasidagi yo‘l, yaqinida bepul arab tili markazi', en: 'The road between the Haram and Quba Mosque, with a free Arabic-language markaz nearby' } },
    'sultana':    { lat: 24.48050, lng: 39.58600, approx: true, ru: 'Султана (Аль-Азхари)', uz: 'Sultona (Al-Azhari)', en: 'Sultana (Al-Azhari)', haram: { ru: '2 км', uz: '2 km', en: '2 km' },
      note: { ru: '750 метров до мечети Аль-Киблатайн', uz: 'Qiblatayn masjidigacha 750 metr', en: '750 metres to Al-Qiblatayn Mosque' } },
    'awali':      { lat: 24.46131, lng: 39.61744, approx: true, ru: 'Авали',                uz: 'Avali', en: 'Awali',        haram: { ru: '1,1 км', uz: '1,1 km', en: '1.1 km' },
      note: { ru: 'Тихий район недалеко от Харама', uz: 'Haramga yaqin tinch hudud', en: 'Quiet area near the Haram' } },
    'jumuah':     { lat: 24.44950, lng: 39.61874, approx: false, ru: 'Аль-Жумуах',           uz: 'Al Jumuah', en: 'Al-Jumuah',    haram: { ru: '15 мин пешком', uz: 'piyoda 15 daqiqa', en: '15 min walk' },
      note: { ru: 'Рядом мечеть Джума и мечеть Куба', uz: 'Yaqinida Jum‘a masjidi va Quba masjidi', en: 'Near Al-Jumuah Mosque and Quba Mosque' } },
    'zahira':     { lat: 24.44637, lng: 39.59970, approx: false, ru: 'Аз-Захира',            uz: 'Az-Zahira', en: 'Az-Zahira',    haram: { ru: '5–7 мин на машине', uz: 'mashinada 5–7 daqiqa', en: '5–7 min by car' },
      note: { ru: 'Спокойный семейный район', uz: 'Tinch oilaviy hudud', en: 'Calm family neighbourhood' } },
    'suhman':     { lat: 24.48300, lng: 39.61500, approx: true, ru: 'Сухман',               uz: 'Suhman', en: 'Suhman',       haram: { ru: '2 км', uz: '2 km', en: '2 km' },
      note: { ru: 'Парк, мечеть в 50 метрах, магазины и аптека', uz: 'Park, 50 metrda masjid, do‘kon va dorixona', en: 'Park, a mosque 50 metres away, shops and a pharmacy' } },
    'anabis':     { lat: 24.47254, lng: 39.58683, approx: false, ru: 'Аль-Анабис',           uz: 'Al Anabis', en: 'Al-Anabis',    haram: { ru: '3 км', uz: '3 km', en: '3 km' },
      note: { ru: 'Рестораны и магазины рядом, до Харама 30–35 минут пешком', uz: 'Atrofda restoran va do‘konlar, Haramgacha piyoda 30–35 daqiqa', en: 'Restaurants and shops nearby, 30–35 minutes\' walk to the Haram' } },
    'hizam':      { lat: 24.47470, lng: 39.63170, approx: true, ru: 'Аль-Хизам',            uz: 'Al Hizam', en: 'Al-Hizam',     haram: { ru: '3 км', uz: '3 km', en: '3 km' },
      note: { ru: 'Семейный район с новыми домами', uz: 'Yangi binoli oilaviy hudud', en: 'Family area with new buildings' } },
    'bahr':       { lat: 24.45339, lng: 39.61379, approx: false, ru: 'Хай аль-Бахр',         uz: 'Hay al-Bahr', en: 'Hay al-Bahr',  haram: { ru: '1,5 км', uz: '1,5 km', en: '1.5 km' },
      note: { ru: '15 минут пешком до Харама', uz: 'Haramgacha piyoda 15 daqiqa', en: '15 minutes\' walk to the Haram' } },
    'bir-usman':  { lat: 24.49230, lng: 39.57979, approx: false, ru: 'Бир Усман',            uz: 'Bir Usmon', en: 'Bir Uthman',    haram: { ru: '2,5 км', uz: '2,5 km', en: '2.5 km' },
      note: { ru: 'Район у колодца Усмана (радыяллаху анху)', uz: 'Usmon (r.a.) qudug‘i yonidagi hudud', en: 'The area around the well of Uthman (may Allah be pleased with him)' } }
  },

  /* --- Ориентиры на карте ------------------------------------------------ */
  landmarks: [
    { id: 'haram', lat: 24.46868, lng: 39.61116, main: true,
      ru: 'Масджид ан-Набави', uz: 'Masjid an-Nabaviy', en: 'Masjid an-Nabawi' },
    { id: 'quba', lat: 24.43942, lng: 39.61746,
      ru: 'Мечеть Куба', uz: 'Quba masjidi', en: 'Quba Mosque' },
    { id: 'qiblatayn', lat: 24.48416, lng: 39.57886,
      ru: 'Мечеть аль-Киблатайн', uz: 'Qiblatayn masjidi', en: 'Al-Qiblatayn Mosque' }
  ],

  /* --- Квартиры ---------------------------------------------------------
     status:  'free'   — свободна
              'booked' — забронирована (bookedUntil — до какой даты держится бронь)
              'busy'   — занята, живут жильцы (busyUntil — когда освободится)
              'rented' — сдана надолго, в каталоге не показывается
              'draft'  — черновик, видит только риелтор
     photos:  имена файлов из assets/img (к каждому есть уменьшенная копия -m.webp)
     videos:  [{ src: 'assets/video/x.mp4', poster: 'assets/img/x-1-m.webp' }]
     geo:     { lat, lng } — точное место; если нет, квартира стоит в центре района
     Цены в саудовских риалах. null — на этот срок не сдаётся.
     ---------------------------------------------------------------------- */
  apartments: [
    {
      id: 'sultana', code: 'TG21', status: 'free', busyUntil: '', updated: '2026-09-15',
      district: 'sultana',
      title: { ru: '2-спальная квартира с гостиной', uz: 'Mehmonxonali 2 yotoqxonali xonadon', en: '2-bedroom apartment with a living room' },
      rooms: 2, beds: 4, baths: 1, floor: null, lift: false,
      price: { month: 2800, day: null, year: null, deposit: 0, agentFee: 600 },
      priceNotes: [],
      includes: ['electricity', 'water', 'wifi', 'furniture', 'ac', 'kitchen'],
      extra: [],
      terms: { iqama: false, minStay: 'month', forWhom: 'any' },
      walk: { haram: { ru: '2 км', uz: '2 km', en: '2 km' }, other: { ru: '750 м до мечети Аль-Киблатайн', uz: 'Qiblatayn masjidigacha 750 m', en: '750 m to Al-Qiblatayn Mosque' } },
      features: [
        { ru: 'Гостиная (салон) и две спальни, 4 кровати', uz: 'Mehmonxona (salon) va ikkita yotoqxona, 4 ta karavot', en: 'Living room (salon) and two bedrooms, 4 beds' },
        { ru: 'Угловая кухня со всей посудой и техникой', uz: 'Barcha idish va texnikasi bor burchak oshxona', en: 'Corner kitchen with all dishes and appliances' },
        { ru: 'Подходит для долгосрочной аренды без икамы', uz: 'Iqomasiz uzoq muddatli ijaraga mos', en: 'Suitable for long-term rent without an iqama' }
      ],
      photos: ['sultana-1.webp', 'sultana-8.webp', 'sultana-2.webp', 'sultana-3.webp', 'sultana-4.webp', 'sultana-5.webp', 'sultana-6.webp', 'sultana-7.webp'],
      post: 'https://t.me/madinah_rent/379'
    },
    {
      id: 'jumuah', code: 'TG08', status: 'free', busyUntil: '', updated: '2026-08-15',
      district: 'jumuah',
      title: { ru: 'Место в квартире премиум-класса (подселение)', uz: 'Premium xonadonda joy (qo‘shni izlanmoqda)', en: 'A room in a premium apartment (shared)' },
      rooms: 2, beds: 1, baths: 1, floor: null, lift: true,
      price: { month: 1700, day: null, year: null, deposit: 0, agentFee: 600 },
      priceNotes: [{ ru: 'Цена за одно место, ищется один сосед', uz: 'Narx bitta joy uchun, bitta qo‘shni izlanmoqda', en: 'Price per person, one flatmate wanted' }],
      includes: ['wifi', 'furniture', 'ac', 'kitchen', 'tv'],
      extra: [],
      terms: { iqama: false, minStay: 'month', forWhom: 'students' , maxPeople: 1 },
      walk: { haram: { ru: '15 мин пешком', uz: 'piyoda 15 daqiqa', en: '15 min walk' }, other: { ru: 'Рядом мечеть Куба', uz: 'Yaqinida Quba masjidi', en: 'Quba Mosque nearby' } },
      features: [
        { ru: 'Элитный дом, большой балкон с видом на город', uz: 'Elita bino, shahar manzarali katta balkon', en: 'Upscale building, large balcony with a city view' },
        { ru: 'Плазма в каждой комнате, скоростной интернет', uz: 'Har xonada plazma, tezkor internet', en: 'TV in every room, fast internet' },
        { ru: 'Рабочий стол и библиотека — удобно студенту', uz: 'Yozuv stoli va kutubxona — talaba uchun qulay', en: 'Desk and a bookshelf — handy for a student' },
        { ru: 'Большой мангал на балконе', uz: 'Balkonda katta mangal', en: 'Big barbecue grill on the balcony' }
      ],
      photos: ['jumuah-1.webp', 'jumuah-2.webp', 'jumuah-8.webp', 'jumuah-3.webp', 'jumuah-4.webp', 'jumuah-5.webp', 'jumuah-6.webp', 'jumuah-7.webp', 'jumuah-9.webp', 'jumuah-10.webp'],
      post: 'https://t.me/madinah_rent/270'
    },
    {
      id: 'zahira', code: 'TG14', status: 'free', busyUntil: '', updated: '2026-08-18',
      district: 'zahira',
      title: { ru: '1-комнатная квартира с террасой', uz: 'Terrasali 1 xonali xonadon', en: '1-room apartment with a terrace' },
      rooms: 1, beds: 2, baths: 1, floor: null, lift: false,
      price: { month: 2200, day: 130, year: null, deposit: 0, agentFee: 500 },
      priceNotes: [{ ru: 'Посуточно, понедельно или на месяц. На длительный срок не сдаётся', uz: 'Kunlik, haftalik yoki oylik. Uzoq muddatga berilmaydi', en: 'Daily, weekly or monthly. Not for long-term rent' }],
      includes: ['electricity', 'water', 'wifi', 'furniture', 'ac', 'kitchen'],
      extra: [],
      terms: { iqama: false, minStay: 'day', forWhom: 'family' },
      walk: { haram: { ru: '30 мин пешком / 5–7 мин на машине', uz: 'piyoda 30 daqiqa / mashinada 5–7 daqiqa', en: '30 min walk / 5–7 min by car' }, other: null },
      features: [
        { ru: 'Своя терраса — редкость для города', uz: 'Shaxsiy terrasa — shaharda kam uchraydi', en: 'A private terrace — rare in the city' },
        { ru: 'Все удобства, включая Wi-Fi', uz: 'Barcha qulayliklar, Wi-Fi bilan', en: 'All amenities, Wi-Fi included' },
        { ru: 'Только для семейных', uz: 'Faqat oilalilar uchun', en: 'Families only' }
      ],
      photos: ['zahira-1.webp', 'zahira-6.webp', 'zahira-2.webp', 'zahira-3.webp', 'zahira-4.webp', 'zahira-5.webp'],
      videos: [{ src: 'assets/video/zahira.mp4', poster: 'assets/img/zahira-poster.webp' }],
      post: 'https://t.me/madinah_rent/296'
    },
    {
      id: 'suhman', code: 'TG16', status: 'free', busyUntil: '', updated: '2026-08-20',
      district: 'suhman',
      title: { ru: '2-комнатная квартира (зал + спальня)', uz: '2 xonali xonadon (zal + yotoqxona)', en: '2-room apartment (living room + bedroom)' },
      rooms: 2, beds: 2, baths: 1, floor: null, lift: false,
      price: { month: 1600, day: null, year: null, deposit: 0, agentFee: 500 },
      priceNotes: [],
      includes: ['furniture', 'ac', 'kitchen'],
      extra: ['electricity'],
      terms: { iqama: false, minStay: 'month', forWhom: 'any' },
      walk: { haram: { ru: '2 км', uz: '2 km', en: '2 km' }, other: { ru: 'Мечеть в 50 метрах от дома', uz: 'Uydan 50 metrda masjid', en: 'Mosque 50 metres from the building' } },
      features: [
        { ru: 'Рядом парк, магазин и аптека', uz: 'Yaqinida park, do‘kon va dorixona', en: 'Park, shop and pharmacy nearby' },
        { ru: 'Небольшая кухня и отдельный санузел', uz: 'Kichik oshxona va alohida sanuzel', en: 'Small kitchen and a separate bathroom' },
        { ru: 'Сдаётся на месяц или на длительный срок', uz: 'Oylik yoki uzoq muddatga beriladi', en: 'Rented monthly or long-term' }
      ],
      photos: ['suhman-1.webp', 'suhman-2.webp', 'suhman-3.webp', 'suhman-4.webp', 'suhman-5.webp'],
      post: 'https://t.me/madinah_rent/304'
    },
    {
      id: 'anabis', code: 'TG17', status: 'free', busyUntil: '', updated: '2026-08-21',
      district: 'anabis',
      title: { ru: 'Квартира 1+1 с новой мебелью', uz: 'Yangi mebelli 1+1 xonadon', en: '1+1 apartment with new furniture' },
      rooms: 2, beds: 2, baths: 1, floor: null, lift: false,
      price: { month: 2000, day: null, year: null, deposit: 0, agentFee: 500 },
      priceNotes: [{ ru: 'Сдаётся только на 1 месяц', uz: 'Faqat 1 oyga beriladi', en: 'Rented for 1 month only' }],
      includes: ['furniture', 'ac', 'kitchen', 'fridge'],
      extra: ['electricity'],
      terms: { iqama: false, minStay: 'month', forWhom: 'any' },
      walk: { haram: { ru: '30–35 мин пешком', uz: 'piyoda 30–35 daqiqa', en: '30–35 min walk' }, other: null },
      features: [
        { ru: 'Спальня и зал, полностью новая мебель', uz: 'Yotoqxona va zal, mebel butunlay yangi', en: 'Bedroom and living room, all-new furniture' },
        { ru: 'Новая техника на кухне', uz: 'Oshxonada yangi texnika', en: 'New kitchen appliances' }
      ],
      photos: ['anabis-1.webp', 'anabis-2.webp', 'anabis-7.webp', 'anabis-3.webp', 'anabis-4.webp', 'anabis-5.webp', 'anabis-6.webp'],
      post: 'https://t.me/madinah_rent/313'
    },
    {
      id: 'tariq-euro', code: 'TG19', status: 'free', busyUntil: '', updated: '2026-09-04',
      district: 'tariq-quba',
      title: { ru: 'Евро-2-комнатная квартира', uz: 'Yevro 2 xonali xonadon', en: 'Euro-style 2-room apartment' },
      rooms: 2, beds: 2, baths: 1, floor: null, lift: false,
      price: { month: 2700, day: null, year: null, deposit: 0, agentFee: 600 },
      priceNotes: [
        { ru: 'Оплата за 3 месяца — 7 500 риалов (выгода 600)', uz: '3 oyga to‘lov — 7 500 rial (600 rial tejaladi)', en: 'Pay for 3 months — 7,500 riyals (save 600)' },
        { ru: 'Оплата за 6 месяцев — 13 800 риалов (выгода 2 400)', uz: '6 oyga to‘lov — 13 800 rial (2 400 rial tejaladi)', en: 'Pay for 6 months — 13,800 riyals (save 2,400)' }
      ],
      includes: ['electricity', 'water', 'wifi', 'furniture', 'ac', 'kitchen'],
      extra: [],
      terms: { iqama: false, minStay: '3months', forWhom: 'any' },
      walk: { haram: { ru: '10–15 мин пешком', uz: 'piyoda 10–15 daqiqa', en: '10–15 min walk' }, other: { ru: '5–7 мин до мечети Куба', uz: 'Quba masjidigacha 5–7 daqiqa', en: '5–7 min to Quba Mosque' } },
      features: [
        { ru: 'Спальня, гостиная, кухня, санузел', uz: 'Yotoqxona, mehmonxona, oshxona, sanuzel', en: 'Bedroom, living room, kitchen, bathroom' },
        { ru: 'Коммунальные включены в цену', uz: 'Kommunal to‘lovlar narx ichida', en: 'Utilities included in the price' },
        { ru: 'Сдаётся на длительный срок', uz: 'Uzoq muddatga beriladi', en: 'Rented long-term' }
      ],
      photos: [],
      videos: [{ src: 'assets/video/tariq-euro.mp4', poster: 'assets/img/tariq-euro-poster.webp' }],
      post: 'https://t.me/madinah_rent/361'
    },
    {
      id: 'tariq-studio', code: 'TG20', status: 'free', busyUntil: '', updated: '2026-09-14',
      district: 'tariq-quba',
      title: { ru: '1-комнатная студия, новый ремонт', uz: 'Yangi ta’mirlangan 1 xonali studiya', en: '1-room studio, freshly renovated' },
      rooms: 1, beds: 2, baths: 1, floor: null, lift: false,
      price: { month: 2000, day: null, year: null, deposit: 1000, agentFee: 600 },
      priceNotes: [{ ru: 'Залог (та’мин) 1 000 риалов возвращается при выезде', uz: 'Garov (ta’min) 1 000 rial chiqishda qaytariladi', en: 'Deposit (ta’min) of 1,000 riyals, returned when you move out' }],
      includes: ['furniture', 'ac', 'kitchen', 'fridge', 'washer'],
      extra: ['electricity', 'gas'],
      terms: { iqama: false, minStay: 'month', forWhom: 'any' },
      walk: { haram: { ru: '10–15 мин пешком', uz: 'piyoda 10–15 daqiqa', en: '10–15 min walk' }, other: { ru: '5–7 мин до мечети Куба', uz: 'Quba masjidigacha 5–7 daqiqa', en: '5–7 min to Quba Mosque' } },
      features: [
        { ru: 'Новый ремонт, вся техника новая', uz: 'Yangi ta’mir, texnikalar yangi', en: 'Fresh renovation, all appliances are new' },
        { ru: 'В районе бесплатный марказ по арабскому языку', uz: 'Hududda bepul arab tili markazi bor', en: 'Free Arabic-language markaz in the area' },
        { ru: 'Можно без икамы, на длительный срок', uz: 'Iqomasiz ham mumkin, uzoq muddatga', en: 'No iqama needed, long-term possible' }
      ],
      photos: [],
      videos: [{ src: 'assets/video/tariq-studio.mp4', poster: 'assets/img/tariq-studio-poster.webp' }],
      post: 'https://t.me/madinah_rent/376'
    },
    {
      id: 'awali', code: 'TG23', status: 'free', busyUntil: '', updated: '2026-09-17',
      district: 'awali',
      title: { ru: '1-комнатная квартира на двоих', uz: 'Ikki kishilik 1 xonali xonadon', en: '1-room apartment for two' },
      rooms: 1, beds: 2, baths: 1, floor: null, lift: false,
      price: { month: 1700, day: null, year: null, deposit: 0, agentFee: 500 },
      priceNotes: [{ ru: 'Цена действует до 1 декабря 2026', uz: 'Narx 2026-yil 1-dekabrgacha amal qiladi', en: 'Price valid until 1 December 2026' }],
      includes: ['furniture', 'ac', 'kitchen', 'fridge', 'washer'],
      extra: ['electricity'],
      terms: { iqama: false, minStay: 'month', forWhom: 'any' , maxPeople: 2 },
      walk: { haram: { ru: '1,1 км', uz: '1,1 km', en: '1.1 km' }, other: null },
      features: [
        { ru: 'Размещение до 2 человек, две кровати', uz: '2 kishigacha joylashish, ikkita karavot', en: 'Up to 2 people, two beds' },
        { ru: 'Кондиционер, холодильник, стиральная машина', uz: 'Konditsioner, muzlatgich, kir yuvish mashinasi', en: 'Air conditioning, fridge, washing machine' },
        { ru: 'Душ с горячей водой', uz: 'Issiq suvli dush', en: 'Hot-water shower' }
      ],
      photos: [],
      videos: [{ src: 'assets/video/awali.mp4', poster: 'assets/img/awali-poster.webp' }],
      post: 'https://t.me/madinah_rent/388'
    },
    {
      id: 'suqiya-2k', code: 'TG22', status: 'free', busyUntil: '', updated: '2026-09-19',
      district: 'suqiya',
      title: { ru: '2-комнатная квартира у Харама', uz: 'Haram yonida 2 xonali xonadon', en: '2-room apartment near the Haram' },
      rooms: 2, beds: 3, baths: 1, floor: null, lift: false,
      price: { month: 3000, day: null, year: null, deposit: 0, agentFee: 600 },
      priceNotes: [],
      includes: ['electricity', 'water', 'wifi', 'furniture', 'ac', 'kitchen'],
      extra: [],
      terms: { iqama: false, minStay: 'month', forWhom: 'any' },
      walk: { haram: { ru: '8–10 мин пешком', uz: 'piyoda 8–10 daqiqa', en: '8–10 min walk' }, other: null },
      features: [
        { ru: 'Две комнаты, кухня, санузел', uz: 'Ikki xona, oshxona, sanuzel', en: 'Two rooms, kitchen, bathroom' },
        { ru: 'Свет, вода и Wi-Fi уже в цене', uz: 'Svet, suv va Wi-Fi narx ichida', en: 'Electricity, water and Wi-Fi already included' }
      ],
      photos: [],
      videos: [{ src: 'assets/video/suqiya-2k.mp4', poster: 'assets/img/suqiya-2k-poster.webp' }],
      post: 'https://t.me/madinah_rent/389'
    },
    {
      id: 'suqiya-1k', code: 'TG22', status: 'free', busyUntil: '', updated: '2026-09-19',
      district: 'suqiya',
      title: { ru: '1-комнатная квартира у Харама', uz: 'Haram yonida 1 xonali xonadon', en: '1-room apartment near the Haram' },
      rooms: 1, beds: 2, baths: 1, floor: null, lift: false,
      price: { month: 1800, day: null, year: null, deposit: 0, agentFee: 500 },
      priceNotes: [{ ru: 'Цена действует до и после Рамадана, в Рамадан меняется', uz: 'Narx Ramazongacha va undan keyin amal qiladi, Ramazonda o‘zgaradi', en: 'Price valid before and after Ramadan, it changes during Ramadan' }],
      includes: ['electricity', 'water', 'wifi', 'furniture', 'ac'],
      extra: [],
      terms: { iqama: false, minStay: 'month', forWhom: 'any' },
      walk: { haram: { ru: '8–10 мин пешком', uz: 'piyoda 8–10 daqiqa', en: '8–10 min walk' }, other: null },
      features: [
        { ru: 'Комната и санузел, всё необходимое есть', uz: 'Xona va sanuzel, zarur narsalar bor', en: 'Room and bathroom, everything you need' },
        { ru: 'Безлимитный Wi-Fi в цене', uz: 'Cheksiz Wi-Fi narx ichida', en: 'Unlimited Wi-Fi included' }
      ],
      photos: [],
      videos: [{ src: 'assets/video/suqiya-1k.mp4', poster: 'assets/img/suqiya-1k-poster.webp' }],
      post: 'https://t.me/madinah_rent/390'
    },
    {
      id: 'suqiya-daily', code: 'TG22', status: 'free', busyUntil: '', updated: '2026-09-20',
      district: 'suqiya',
      title: { ru: '1-комнатная посуточно и помесячно', uz: 'Kunlik va oylik 1 xonali xonadon', en: '1-room apartment, daily or monthly' },
      rooms: 1, beds: 2, baths: 1, floor: 4, lift: false,
      price: { month: 2000, day: 120, year: null, deposit: 0, agentFee: 500 },
      priceNotes: [],
      includes: ['electricity', 'water', 'wifi', 'furniture', 'ac'],
      extra: [],
      terms: { iqama: false, minStay: 'day', forWhom: 'any' },
      walk: { haram: { ru: '~1 км, около 9 минут пешком', uz: '~1 km, piyoda 9 daqiqacha', en: '~1 km, about 9 minutes on foot' }, other: null },
      features: [
        { ru: 'Удобно на умру: можно взять на несколько дней', uz: 'Umra uchun qulay: bir necha kunga olish mumkin', en: 'Good for Umrah: you can take it for a few days' },
        { ru: '4 этаж', uz: '4-qavat', en: '4th floor' }
      ],
      photos: [],
      videos: [{ src: 'assets/video/suqiya-daily.mp4', poster: 'assets/img/suqiya-daily-poster.webp' }],
      post: 'https://t.me/madinah_rent/392'
    },
    {
      id: 'fath-2k', code: 'TG18', status: 'free', busyUntil: '', updated: '2026-09-08',
      district: 'fath',
      title: { ru: '2-комнатная квартира в Аль-Фатхе', uz: 'Al Fathda 2 xonali xonadon', en: '2-room apartment in Al-Fath' },
      rooms: 2, beds: 3, baths: 1, floor: null, lift: false,
      price: { month: 2500, day: null, year: null, deposit: 0, agentFee: 600 },
      priceNotes: [{ ru: 'При аренде дольше 4 месяцев — скидка', uz: '4 oydan uzoqroq ijaraga olinsa — chegirma', en: 'Discount for stays longer than 4 months' }],
      includes: ['electricity', 'water', 'furniture', 'washer'],
      extra: [],
      terms: { iqama: false, minStay: 'month', forWhom: 'any' },
      walk: { haram: { ru: '1,2 км, 15–20 мин пешком', uz: '1,2 km, piyoda 15–20 daqiqa', en: '1.2 km, 15–20 min walk' }, other: null },
      features: [
        { ru: 'Две комнаты, кухня и санузел с ванной', uz: 'Ikki xona, oshxona va vannali sanuzel', en: 'Two rooms, a kitchen and a bathroom with a tub' },
        { ru: 'Три спальных места, есть стиральная машина', uz: 'Uchta yotoq joy, kir yuvish mashinasi bor', en: 'Three beds and a washing machine' },
        { ru: 'Коммуналка включена в цену', uz: 'Kommunal to‘lov narx ichida', en: 'Utilities included' }
      ],
      photos: [],
      videos: [{ src: 'assets/video/fath-2k.mp4', poster: 'assets/img/fath-2k-poster.webp' }],
      post: 'https://t.me/madinah_rent/364'
    },
    {
      id: 'fath-1k', code: 'TG18', status: 'free', busyUntil: '', updated: '2026-08-26',
      district: 'fath',
      title: { ru: '1-комнатная квартира', uz: '1 xonali xonadon', en: '1-room apartment' },
      rooms: 1, beds: 2, baths: 1, floor: null, lift: false,
      price: { month: 1800, day: null, year: null, deposit: 0, agentFee: 500 },
      priceNotes: [{ ru: 'При аренде дольше 3 месяцев — 1 700 риалов в месяц', uz: '3 oydan uzoqroq olinganda — oyiga 1 700 rial', en: 'For stays longer than 3 months — 1,700 riyals a month' }],
      includes: ['water', 'furniture', 'ac', 'kitchen'],
      extra: ['electricity'],
      terms: { iqama: false, minStay: 'month', forWhom: 'any' },
      walk: { haram: { ru: '1,2 км, 15–20 мин пешком', uz: '1,2 km, piyoda 15–20 daqiqa', en: '1.2 km, 15–20 min walk' }, other: null },
      features: [
        { ru: 'Комната, кухня и санузел', uz: 'Xona, oshxona va sanuzel', en: 'Room, kitchen and bathroom' },
        { ru: 'Свет оплачивается по счётчику', uz: 'Svet hisoblagich bo‘yicha to‘lanadi', en: 'Electricity paid by the meter' }
      ],
      photos: [],
      videos: [{ src: 'assets/video/fath-1k.mp4', poster: 'assets/img/fath-1k-poster.webp' }],
      post: 'https://t.me/madinah_rent/334'
    },
    {
      id: 'hizam', code: 'TG15', status: 'free', busyUntil: '', updated: '2026-08-30',
      district: 'hizam',
      title: { ru: '2-комнатная квартира для семьи', uz: 'Oila uchun 2 xonali xonadon', en: '2-room apartment for a family' },
      rooms: 2, beds: 2, baths: 2, floor: 1, lift: true,
      price: { month: 2000, day: null, year: 21600, deposit: 0, agentFee: 500 },
      priceNotes: [{ ru: 'При оплате за год одним платежом — 21 600 риалов (выгода 2 400)', uz: 'Yillik bir to‘lovda — 21 600 rial (2 400 rial tejaladi)', en: 'Pay for a year up front — 21,600 riyals (save 2,400)' }],
      includes: ['furniture', 'ac', 'kitchen'],
      extra: ['electricity', 'water'],
      terms: { iqama: false, minStay: 'month', forWhom: 'family' },
      walk: { haram: { ru: '3 км', uz: '3 km', en: '3 km' }, other: null },
      features: [
        { ru: 'Новая встроенная кухня', uz: 'Yangi o‘rnatilgan oshxona', en: 'New fitted kitchen' },
        { ru: 'Два санузла', uz: 'Ikkita sanuzel', en: 'Two bathrooms' },
        { ru: '1 этаж, в доме есть лифт', uz: '1-qavat, binoda lift bor', en: 'Ground floor, the building has a lift' }
      ],
      photos: [],
      videos: [{ src: 'assets/video/hizam.mp4', poster: 'assets/img/hizam-poster.webp' }],
      post: 'https://t.me/madinah_rent/345'
    },
    {
      id: 'bahr', code: 'TG13', status: 'free', busyUntil: '', updated: '2026-08-20',
      district: 'bahr',
      title: { ru: '2-спальная квартира посуточно', uz: 'Kunlik 2 yotoqxonali xonadon', en: '2-bedroom apartment, daily rent' },
      rooms: 2, beds: 4, baths: 1, floor: 1, lift: false,
      price: { month: 2500, day: 170, year: null, deposit: 0, agentFee: 500 },
      priceNotes: [
        { ru: 'От 5 дней — 150 риалов в сутки', uz: '5 kundan — kuniga 150 rial', en: 'From 5 days — 150 riyals per night' },
        { ru: 'От 10 дней — 120 риалов в сутки', uz: '10 kundan — kuniga 120 rial', en: 'From 10 days — 120 riyals per night' }
      ],
      includes: ['wifi', 'furniture', 'ac', 'kitchen'],
      extra: ['electricity'],
      terms: { iqama: false, minStay: 'day', forWhom: 'any' },
      walk: { haram: { ru: '1,5 км, 15 мин пешком', uz: '1,5 km, piyoda 15 daqiqa', en: '1.5 km, 15 min walk' }, other: null },
      features: [
        { ru: 'Две спальни, кухня, санузел', uz: 'Ikki yotoqxona, oshxona, sanuzel', en: 'Two bedrooms, kitchen, bathroom' },
        { ru: '1 этаж — удобно с детьми и пожилыми', uz: '1-qavat — bolalar va keksalar uchun qulay', en: 'Ground floor — easy with children and elderly relatives' },
        { ru: 'Чем дольше срок, тем ниже цена за сутки', uz: 'Muddat uzoq bo‘lsa, kunlik narx arzonlashadi', en: 'The longer the stay, the lower the nightly price' }
      ],
      photos: [],
      videos: [{ src: 'assets/video/bahr.mp4', poster: 'assets/img/bahr-poster.webp' }],
      post: 'https://t.me/madinah_rent/309'
    },
    {
      id: 'bir-usman', code: 'TG12', status: 'free', busyUntil: '', updated: '2026-08-21',
      district: 'bir-usman',
      title: { ru: '2-комнатная с большим залом', uz: 'Katta zalli 2 xonali xonadon', en: '2-room apartment with a large hall' },
      rooms: 3, beds: 3, baths: 1, floor: null, lift: false,
      price: { month: 2500, day: null, year: null, deposit: 0, agentFee: 600 },
      priceNotes: [
        { ru: 'Оплата раз в 4 месяца — 2 500 риалов в месяц', uz: 'Har 4 oyda to‘lov — oyiga 2 500 rial', en: 'Paid every 4 months — 2,500 riyals a month' },
        { ru: 'Оплата раз в 6 месяцев — 2 350 риалов в месяц', uz: 'Har 6 oyda to‘lov — oyiga 2 350 rial', en: 'Paid every 6 months — 2,350 riyals a month' }
      ],
      includes: ['furniture', 'ac', 'kitchen'],
      extra: ['electricity', 'water'],
      terms: { iqama: false, minStay: '6months', forWhom: 'any' },
      walk: { haram: { ru: '2,5 км', uz: '2,5 km', en: '2.5 km' }, other: null },
      features: [
        { ru: 'Новый ремонт', uz: 'Yangi ta’mir', en: 'Fresh renovation' },
        { ru: 'Две комнаты и большой зал', uz: 'Ikki xona va katta zal', en: 'Two rooms and a large hall' },
        { ru: 'Сдаётся от полугода', uz: 'Yarim yildan beriladi', en: 'Rented for 6 months or more' }
      ],
      photos: [],
      videos: [{ src: 'assets/video/bir-usman.mp4', poster: 'assets/img/bir-usman-poster.webp' }],
      post: 'https://t.me/madinah_rent/312'
    }
  ],

  /* --- Услуги Madinah Group: визы, туры, аренда машин ---------------------
     price: null — в приложении «Цена по запросу». Визы — в долларах, туры и машины — в риалах.
     С сервером всё это Абдуллах правит сам: Панель риелтора → «Услуги».
     ---------------------------------------------------------------------- */
  services: {
    visa: {
      // Визовая компания-партнёр. С сервером заявки уходят ей в Telegram
      // (подключается ссылкой из панели). Здесь — запасные контакты для каталога без сервера.
      partner: { name: '', tg: '', wa: '' },
      commissionPct: 5,          // наценка Абдуллаха для клиентов от него, % — идёт в отчёт
      currency: 'USD',
      intro: {
        ru: 'Любая виза в Саудовскую Аравию и услуги по икаме — через партнёрскую визовую компанию. Выберите, что нужно, и оставьте контакты: заявка сразу уйдёт в компанию, и с вами свяжутся.',
        uz: 'Saudiya Arabistoniga istalgan viza va iqoma bo‘yicha xizmatlar — hamkor viza kompaniyasi orqali. Keraklisini tanlang va kontaktlaringizni qoldiring: ariza darhol kompaniyaga boradi va siz bilan bog‘lanishadi.',
        en: 'Any Saudi visa and iqama services — through a partner visa company. Choose what you need and leave your contacts: the request goes straight to the company, and they will get in touch.'
      },
      docs: [
        { ru: 'Скан загранпаспорта — срок действия не меньше 6 месяцев', uz: 'Xorijiy pasport nusxasi — amal qilish muddati kamida 6 oy', en: 'Passport scan — valid for at least 6 more months' },
        { ru: 'Цветное фото на белом фоне', uz: 'Oq fonda rangli surat', en: 'Colour photo on a white background' },
        { ru: 'Даты поездки и город прилёта', uz: 'Safar sanalari va qo‘nish shahri', en: 'Travel dates and arrival city' }
      ],
      docsNote: {
        ru: 'Для каждого вида визы и услуги по икаме документы и сроки свои — точный список и цену подтвердит визовая компания.',
        uz: 'Har bir viza turi va iqoma xizmati uchun hujjatlar va muddatlar o‘ziga xos — aniq ro‘yxat va narxni viza kompaniyasi tasdiqlaydi.',
        en: 'Each visa type and iqama service has its own documents and timing — the visa company will confirm the exact list and price.'
      },
      cats: [
        { id: 'trip',   title: { ru: 'Поездка', uz: 'Safar', en: 'Travel' } },
        { id: 'invite', title: { ru: 'По приглашению', uz: 'Taklif bilan', en: 'By invitation' } },
        { id: 'life',   title: { ru: 'Работа и учёба', uz: 'Ish va o‘qish', en: 'Work & study' } },
        { id: 'iqama',  title: { ru: 'Икама', uz: 'Iqoma', en: 'Iqama' },
          note: { ru: 'Для тех, кто живёт и работает в Саудовской Аравии', uz: 'Saudiya Arabistonida yashab, ishlayotganlar uchun', en: 'For those living and working in Saudi Arabia' } }
      ],
      types: [
        {
          id: 'tourist', cat: 'trip', icon: 'plane',
          title: { ru: 'Туристическая виза', uz: 'Turistik viza', en: 'Tourist visa' },
          text: {
            ru: 'Для поездки в Саудовскую Аравию: зиярат, визиты к близким, отдых. С ней можно совершить умру вне сезона хаджа.',
            uz: 'Saudiya Arabistoniga safar uchun: ziyorat, yaqinlarni ko‘rish, dam olish. U bilan haj mavsumidan tashqari umra qilish mumkin.',
            en: 'For a trip to Saudi Arabia: ziyarat, visiting family, leisure. It also lets you perform umrah outside the Hajj season.'
          }
        },
        {
          id: 'umrah', cat: 'trip', icon: 'kaaba',
          title: { ru: 'Виза для умры', uz: 'Umra vizasi', en: 'Umrah visa' },
          text: {
            ru: 'Для паломников, которые едут совершить умру и посетить Медину.',
            uz: 'Umra qilish va Madinani ziyorat qilish uchun boradigan ziyoratchilar uchun.',
            en: 'For pilgrims travelling to perform umrah and visit Madinah.'
          }
        },
        {
          id: 'transit', cat: 'trip', icon: 'transit',
          title: { ru: 'Транзитная виза (stopover)', uz: 'Tranzit viza (stopover)', en: 'Transit visa (stopover)' },
          text: {
            ru: 'Для короткой остановки в Саудовской Аравии при перелёте через страну (обычно до 96 часов) — можно успеть совершить умру и посетить Медину.',
            uz: 'Mamlakat orqali uchishda Saudiya Arabistonida qisqa to‘xtash uchun (odatda 96 soatgacha) — umra qilib, Madinani ziyorat qilishga ulgurish mumkin.',
            en: 'For a short stopover in Saudi Arabia when flying through the country (usually up to 96 hours) — enough to perform umrah and visit Madinah.'
          }
        },
        {
          id: 'hajj', cat: 'trip', icon: 'kaaba',
          title: { ru: 'Виза для хаджа', uz: 'Haj vizasi', en: 'Hajj visa' },
          text: {
            ru: 'Выдаётся по квоте вашей страны через официальных операторов хаджа. Подскажем, как её получить, и поможем с жильём в Медине.',
            uz: 'Mamlakatingiz kvotasi bo‘yicha rasmiy haj operatorlari orqali beriladi. Qanday olishni tushuntirib beramiz va Madinada uy-joy bilan yordam beramiz.',
            en: 'Issued under your country’s quota through official Hajj operators. We’ll explain how to get one and help with accommodation in Madinah.'
          }
        },
        {
          id: 'family-visit', cat: 'invite', icon: 'family',
          title: { ru: 'Гостевая виза к родственникам', uz: 'Qarindoshlarga mehmon vizasi', en: 'Family visit visa' },
          text: {
            ru: 'Для визита к родственникам, которые живут в Саудовской Аравии по икаме, — по их приглашению.',
            uz: 'Saudiya Arabistonida iqoma bilan yashovchi qarindoshlarni ularning taklifi bilan ziyorat qilish uchun.',
            en: 'For visiting relatives who live in Saudi Arabia on an iqama — at their invitation.'
          }
        },
        {
          id: 'business', cat: 'invite', icon: 'briefcase',
          title: { ru: 'Деловая виза', uz: 'Ishbilarmonlik vizasi', en: 'Business visa' },
          text: {
            ru: 'Для деловых поездок: переговоры, выставки, встречи — по приглашению саудовской компании.',
            uz: 'Ishbilarmonlik safarlari uchun: muzokaralar, ko‘rgazmalar, uchrashuvlar — Saudiya kompaniyasining taklifi bilan.',
            en: 'For business trips — negotiations, exhibitions, meetings — at the invitation of a Saudi company.'
          }
        },
        {
          id: 'work', cat: 'life', icon: 'work',
          title: { ru: 'Рабочая виза', uz: 'Ishchi viza', en: 'Work visa' },
          text: {
            ru: 'Для работы в Саудовской Аравии по контракту с работодателем. После въезда оформляется икама.',
            uz: 'Ish beruvchi bilan shartnoma asosida Saudiya Arabistonida ishlash uchun. Kirgandan keyin iqoma rasmiylashtiriladi.',
            en: 'For working in Saudi Arabia under a contract with an employer. An iqama is issued after arrival.'
          }
        },
        {
          id: 'student', cat: 'life', icon: 'student',
          title: { ru: 'Студенческая виза', uz: 'Talaba vizasi', en: 'Student visa' },
          text: {
            ru: 'Для учёбы в Саудовской Аравии — например, в Исламском университете Медины — после зачисления.',
            uz: 'Saudiya Arabistonida o‘qish uchun — masalan, Madina Islom universitetida — o‘qishga qabul qilingandan keyin.',
            en: 'For studying in Saudi Arabia — for example at the Islamic University of Madinah — after admission.'
          }
        },
        {
          id: 'family-join', cat: 'life', icon: 'home',
          title: { ru: 'Семейная виза (переезд семьи)', uz: 'Oilaviy viza (oilani ko‘chirish)', en: 'Family residence visa' },
          text: {
            ru: 'Для жены и детей того, кто работает в Саудовской Аравии по икаме: приезд на постоянное проживание.',
            uz: 'Saudiya Arabistonida iqoma bilan ishlaydigan kishining xotini va bolalari uchun: doimiy yashashga kelish.',
            en: 'For the wife and children of someone working in Saudi Arabia on an iqama: coming to live permanently.'
          }
        },
        {
          id: 'iqama-new', cat: 'iqama', icon: 'idcard',
          title: { ru: 'Оформление икамы', uz: 'Iqomani rasmiylashtirish', en: 'New iqama' },
          text: {
            ru: 'Первичное оформление вида на жительство после въезда по рабочей или семейной визе.',
            uz: 'Ishchi yoki oilaviy viza bilan kirgandan keyin yashash guvohnomasini birinchi marta rasmiylashtirish.',
            en: 'First-time residence permit after arriving on a work or family visa.'
          }
        },
        {
          id: 'iqama-renew', cat: 'iqama', icon: 'idcard',
          title: { ru: 'Продление икамы', uz: 'Iqomani uzaytirish', en: 'Iqama renewal' },
          text: {
            ru: 'Продление срока действия икамы — вовремя, чтобы не было штрафов за просрочку.',
            uz: 'Iqoma muddatini o‘z vaqtida uzaytirish — kechiktirganlik uchun jarimalar bo‘lmasligi uchun.',
            en: 'Renewing the iqama on time to avoid late penalties.'
          }
        },
        {
          id: 'iqama-transfer', cat: 'iqama', icon: 'transfer',
          title: { ru: 'Перевод кафиля (спонсора)', uz: 'Kafilni (homiyni) o‘zgartirish', en: 'Sponsor transfer (kafala)' },
          text: {
            ru: 'Перевод икамы на другого работодателя — «накль кафаля».',
            uz: 'Iqomani boshqa ish beruvchiga o‘tkazish — «naql kafola».',
            en: 'Transferring the iqama to another employer (naql kafala).'
          }
        },
        {
          id: 'exit-reentry', cat: 'iqama', icon: 'reentry',
          title: { ru: 'Выездная-возвратная виза', uz: 'Chiqish-qaytish vizasi', en: 'Exit re-entry visa' },
          text: {
            ru: 'Для резидентов: выехать из страны и вернуться по той же икаме.',
            uz: 'Rezidentlar uchun: mamlakatdan chiqib, o‘sha iqoma bilan qaytish.',
            en: 'For residents: leave the country and return on the same iqama.'
          }
        },
        {
          id: 'final-exit', cat: 'iqama', icon: 'exit',
          title: { ru: 'Окончательный выезд', uz: 'Butunlay chiqib ketish', en: 'Final exit' },
          text: {
            ru: 'Закрыть икаму и выехать из Саудовской Аравии насовсем — «хурудж нихаи».',
            uz: 'Iqomani yopib, Saudiya Arabistonidan butunlay chiqib ketish — «xuruj nihoiy».',
            en: 'Close the iqama and leave Saudi Arabia for good (final exit).'
          }
        },
        {
          id: 'dependents', cat: 'iqama', icon: 'family',
          title: { ru: 'Семья в икаму', uz: 'Oilani iqomaga qo‘shish', en: 'Adding dependents' },
          text: {
            ru: 'Вписать жену и детей в икаму как иждивенцев.',
            uz: 'Xotin va bolalarni iqomaga qaramog‘idagilar sifatida kiritish.',
            en: 'Adding your wife and children to your iqama as dependents.'
          }
        }
      ],
      terms: [
        { ru: 'Визу выдают власти Саудовской Аравии. Решение и сроки зависят только от них — выдачу визы никто не может гарантировать.', uz: 'Vizani Saudiya Arabistoni hokimiyati beradi. Qaror va muddatlar faqat ularga bog‘liq — vizani hech kim kafolatlay olmaydi.', en: 'Visas are issued by the Saudi authorities. The decision and timing are theirs alone — no one can guarantee a visa.' },
        { ru: 'Заявку ведёт партнёрская визовая компания. Madinah Group передаёт ей вашу заявку и не отвечает за её решения и сроки.', uz: 'Arizani hamkor viza kompaniyasi yuritadi. Madinah Group arizangizni unga topshiradi va uning qarorlari hamda muddatlari uchun javob bermaydi.', en: 'The partner visa company handles the application. Madinah Group passes your request on and is not responsible for the company’s decisions or timing.' },
        { ru: 'Цену, порядок оплаты и возврата визовая компания называет до оплаты. Сборы за уже поданную заявку обычно не возвращаются.', uz: 'Narx, to‘lov va qaytarish tartibini viza kompaniyasi to‘lovdan oldin aytadi. Topshirilgan ariza uchun yig‘imlar odatda qaytarilmaydi.', en: 'The visa company states the price, payment and refund terms before you pay. Fees for an application already submitted are usually non-refundable.' },
        { ru: 'Вы отвечаете за правильность паспортных данных и документов: ошибка — частая причина отказа.', uz: 'Pasport ma’lumotlari va hujjatlarning to‘g‘riligi uchun o‘zingiz javob berasiz: xato — rad etilishning ko‘p uchraydigan sababi.', en: 'You are responsible for correct passport details and documents: mistakes are a common reason for refusal.' },
        { ru: 'Икаму оформляют и продлевают государственные органы Саудовской Аравии; штрафы за просрочку начисляют они — Madinah Group на это не влияет.', uz: 'Iqomani Saudiya Arabistoni davlat idoralari rasmiylashtiradi va uzaytiradi; kechiktirish jarimalarini ular belgilaydi — Madinah Group bunga ta’sir qilmaydi.', en: 'Iqamas are issued and renewed by the Saudi authorities, who also charge late penalties — Madinah Group has no influence over this.' },
        { ru: 'Отказ в визе, изменение правил въезда, задержка или отмена рейса — форс-мажор. Madinah Group за это ответственности не несёт.', uz: 'Viza rad etilishi, kirish qoidalarining o‘zgarishi, reysning kechikishi yoki bekor qilinishi — fors-major. Madinah Group bunga javob bermaydi.', en: 'Visa refusal, changes to entry rules, flight delays or cancellations are force majeure. Madinah Group is not liable for them.' }
      ],
      consent: {
        ru: 'Я согласен(на) с условиями: визу выдают власти Саудовской Аравии, заявку ведёт партнёрская визовая компания, Madinah Group за отказ и сроки не отвечает.',
        uz: 'Shartlarga roziman: vizani Saudiya Arabistoni hokimiyati beradi, arizani hamkor viza kompaniyasi yuritadi, Madinah Group rad etish va muddatlar uchun javob bermaydi.',
        en: 'I accept the terms: visas are issued by the Saudi authorities, the partner visa company handles the application, and Madinah Group is not liable for refusals or timing.'
      }
    },

    tours: {
      intro: {
        ru: 'Поездки по святым местам Медины и помощь с умрой. По Медине вас проведу я сам — всё покажу и расскажу.',
        uz: 'Madinaning muqaddas joylari bo‘ylab sayohatlar va umrada yordam. Madina bo‘ylab o‘zim olib boraman — hammasini ko‘rsatib, aytib beraman.',
        en: 'Trips to the sacred sites of Madinah and help with umrah. I guide the Madinah tours myself — I’ll show you everything and tell the story.'
      },
      items: [
        {
          id: 'ziyarat', icon: 'route', guide: true, price: null, per: 'group', duration: null,
          title: { ru: 'Зиярат по Медине с гидом', uz: 'Madina bo‘ylab gid bilan ziyorat', en: 'Madinah ziyarat with a guide' },
          text: {
            ru: 'Объезжаем памятные места Медины на машине. Я сам веду экскурсию и рассказываю историю каждого места — на русском или узбекском.',
            uz: 'Madinaning muborak joylarini mashinada aylanamiz. Ekskursiyani o‘zim olib boraman va har bir joy tarixini aytib beraman — rus yoki o‘zbek tilida.',
            en: 'We drive around the memorable sites of Madinah. I lead the tour myself and tell the story of each place — in Russian or Uzbek.'
          },
          stops: [
            { title: { ru: 'Гора Ухуд и кладбище шахидов', uz: 'Uhud tog‘i va shahidlar qabristoni', en: 'Mount Uhud and the martyrs’ cemetery' },
              text: { ru: 'Место битвы при Ухуде. Здесь похоронены шахиды Ухуда и Хамза — дядя Пророка ﷺ.', uz: 'Uhud jangi bo‘lgan joy. Bu yerda Uhud shahidlari va Payg‘ambarimiz ﷺ amakilari Hamza dafn etilgan.', en: 'The site of the Battle of Uhud, where the martyrs of Uhud and Hamza, the Prophet’s ﷺ uncle, are buried.' } },
            { title: { ru: 'Мечеть Куба', uz: 'Quba masjidi', en: 'Quba Mosque' },
              text: { ru: 'Первая мечеть в истории ислама. По хадису, намаз в ней по награде подобен умре.', uz: 'Islom tarixidagi birinchi masjid. Hadisga ko‘ra, unda o‘qilgan namoz savobi umraga tengdir.', en: 'The first mosque in the history of Islam. According to hadith, a prayer there is rewarded like an umrah.' } },
            { title: { ru: 'Мечеть аль-Киблатайн', uz: 'Qiblatayn masjidi', en: 'Al-Qiblatayn Mosque' },
              text: { ru: 'Мечеть двух кибл: здесь во время намаза пришло повеление повернуться от Иерусалима к Каабе.', uz: 'Ikki qibla masjidi: shu yerda namoz paytida Quddusdan Ka’baga yuzlanish amri kelgan.', en: 'The Mosque of the Two Qiblas, where during prayer the command came to turn from Jerusalem to the Kaaba.' } },
            { title: { ru: 'Сад Салмана аль-Фариси', uz: 'Salmon al-Forsiy bog‘i', en: 'Garden of Salman al-Farsi' },
              text: { ru: 'Финиковая роща, связанная с историей Салмана аль-Фариси: Пророк ﷺ помог ему посадить пальмы, чтобы выкупить себя из рабства.', uz: 'Salmon al-Forsiy tarixi bilan bog‘liq xurmozor: Payg‘ambarimiz ﷺ uning qullikdan ozod bo‘lishi uchun xurmo ko‘chatlarini ekishga yordam berganlar.', en: 'A date grove linked to the story of Salman al-Farsi: the Prophet ﷺ helped him plant palms to buy his freedom from slavery.' } },
            { title: { ru: 'Финиковая ферма', uz: 'Xurmo fermasi', en: 'Date farm' },
              text: { ru: 'Финиковые сады Медины: аджва и другие сорта. Можно попробовать и купить свежие финики.', uz: 'Madina xurmozorlari: ajva va boshqa navlar. Yangi xurmoni tatib ko‘rish va sotib olish mumkin.', en: 'The date farms of Madinah: ajwa and other varieties. You can taste and buy fresh dates.' } }
          ],
          note: {
            ru: 'Маршрут и время подбираем под вас — можно добавить и другие места.',
            uz: 'Yo‘nalish va vaqtni sizga moslaymiz — boshqa joylarni ham qo‘shish mumkin.',
            en: 'We adjust the route and time to you — other places can be added too.'
          }
        },
        {
          id: 'umrah-tour', icon: 'kaaba', guide: false, price: null, per: 'person', duration: null,
          title: { ru: 'Умра-тур', uz: 'Umra safari', en: 'Umrah trip' },
          text: {
            ru: 'Поможем собрать поездку на умру под ключ: виза, жильё рядом с Харамом, зиярат по Медине с гидом. Состав и цену подберём под вас.',
            uz: 'Umra safarini to‘liq tashkil qilishga yordam beramiz: viza, Haramga yaqin uy-joy, Madina bo‘ylab gid bilan ziyorat. Tarkib va narxni sizga moslab tanlaymiz.',
            en: 'We help put together a complete umrah trip: visa, accommodation near the Haram and a guided ziyarat of Madinah. We tailor the package and price to you.'
          },
          includes: [
            { ru: 'Виза', uz: 'Viza', en: 'Visa' },
            { ru: 'Жильё у Харама', uz: 'Haram yonida uy-joy', en: 'Stay near the Haram' },
            { ru: 'Зиярат с гидом', uz: 'Gid bilan ziyorat', en: 'Guided ziyarat' }
          ]
        }
      ],
      terms: [
        { ru: 'Маршрут, дату, время и цену согласуем до поездки — за группу или за человека, как договоримся.', uz: 'Yo‘nalish, sana, vaqt va narxni safardan oldin kelishamiz — guruh yoki kishi boshiga, kelishuvga ko‘ra.', en: 'We agree the route, date, time and price before the trip — per group or per person, as agreed.' },
        { ru: 'Если планы изменились, предупредите заранее — перенесём на другой день.', uz: 'Rejalar o‘zgarsa, oldindan xabar bering — boshqa kunga ko‘chiramiz.', en: 'If your plans change, let us know in advance and we’ll move the trip to another day.' },
        { ru: 'В мечетях соблюдаем правила посещения: закрытая одежда, время намаза.', uz: 'Masjidlarda tashrif qoidalariga amal qilamiz: yopiq kiyim, namoz vaqtlari.', en: 'At the mosques we follow the visiting rules: modest dress and prayer times.' },
        { ru: 'Перекрытие дорог, погода, решения властей — форс-мажор: поездку переносим.', uz: 'Yo‘llarning yopilishi, ob-havo, hokimiyat qarorlari — fors-major: safarni ko‘chiramiz.', en: 'Road closures, weather and government decisions are force majeure: we reschedule the trip.' },
        { ru: 'В умра-туре визу оформляет партнёрская визовая компания — действуют условия раздела «Виза».', uz: 'Umra safarida vizani hamkor viza kompaniyasi rasmiylashtiradi — «Viza» bo‘limi shartlari amal qiladi.', en: 'For the umrah trip the visa is handled by the partner visa company — the Visa terms apply.' }
      ],
      consent: {
        ru: 'Я согласен(на) с условиями: маршрут, время и цена согласуются до поездки, при форс-мажоре поездка переносится.',
        uz: 'Shartlarga roziman: yo‘nalish, vaqt va narx safardan oldin kelishiladi, fors-majorda safar ko‘chiriladi.',
        en: 'I accept the terms: the route, time and price are agreed before the trip, and in force majeure the trip is rescheduled.'
      }
    },

    cars: {
      intro: {
        ru: 'Аренда машин в Медине на нужные вам дни.',
        uz: 'Madinada kerakli kunlaringizga avtomobil ijarasi.',
        en: 'Car rental in Madinah for the days you need.'
      },
      emptyNote: {
        ru: 'Фото и цены машин скоро появятся. Уже сейчас можно оставить заявку — подберём машину под ваши даты.',
        uz: 'Mashinalar surati va narxlari tez orada paydo bo‘ladi. Hozirning o‘zida ariza qoldirish mumkin — sanalaringizga mos mashina topamiz.',
        en: 'Car photos and prices are coming soon. You can already leave a request and we’ll find a car for your dates.'
      },
      // status: 'free' — свободна, 'booked' — забронирована (bookedUntil — до какой даты);
      // busy — даты броней по подтверждённым заявкам, сервер добавляет их сам.
      // Фото — модели с Wikimedia Commons (CC BY-SA 4.0, автор Damian B Oh; обрезаны и уменьшены).
      // В карточке помечены «Фото модели, не этой машины» с подписью автора. Когда Абдуллах
      // загрузит свои фото и удалит эти, пометка и подпись пропадут сами.
      items: [
        { id: 'car-mkx-2016', name: 'Lincoln MKX', year: 2016, color: 'black', trim: '',
          photos: ['car-mkx-2016-1.webp', 'car-mkx-2016-2.webp', 'car-mkx-2016-3.webp'],
          credit: 'Damian B Oh / Wikimedia Commons, CC BY-SA 4.0', creditUrl: 'https://commons.wikimedia.org/wiki/File:Lincoln_MKX_CD4_black_(3).jpg',
          seats: 5, gear: 'auto', pricePerDay: null, deposit: null, note: null, active: true,
          status: 'free', bookedUntil: '', busy: [] },
        { id: 'car-mkx-2013', name: 'Lincoln MKX', year: 2013, color: 'black', trim: 'Full option',
          photos: ['car-mkx-2013-1.webp', 'car-mkx-2013-2.webp', 'car-mkx-2013-3.webp'],
          credit: 'Damian B Oh / Wikimedia Commons, CC BY-SA 4.0', creditUrl: 'https://commons.wikimedia.org/wiki/File:Lincoln_MKX_U388_FL_Tuxedo_Black_Metallic_(4).jpg',
          seats: 5, gear: 'auto', pricePerDay: null, deposit: null, note: null, active: true,
          status: 'free', bookedUntil: '', busy: [] }
      ],
      terms: [
        { ru: 'Нужны действующие водительские права и паспорт. Какие права подходят, залог и условия — уточним до выдачи машины.', uz: 'Amaldagi haydovchilik guvohnomasi va pasport kerak. Qaysi guvohnoma mos kelishi, garov va shartlarni mashina berilishidan oldin aniqlaymiz.', en: 'You need a valid driving licence and passport. We’ll confirm which licences are accepted, the deposit and terms before handover.' },
        { ru: 'Машину осматриваем вместе при выдаче: царапины и повреждения фиксируем на фото.', uz: 'Mashinani berishda birga ko‘zdan kechiramiz: tirnalish va shikastlarni suratga olamiz.', en: 'We inspect the car together at handover and photograph any scratches or damage.' },
        { ru: 'Штрафы за нарушения и повреждения во время аренды оплачивает арендатор.', uz: 'Ijara davridagi jarimalar va shikastlar uchun ijarachi to‘laydi.', en: 'Traffic fines and damage during the rental are paid by the renter.' },
        { ru: 'Возвращайте машину вовремя и с тем же уровнем топлива, если не договорились иначе.', uz: 'Mashinani o‘z vaqtida va o‘sha yoqilg‘i darajasi bilan qaytaring, boshqacha kelishilmagan bo‘lsa.', en: 'Return the car on time and with the same fuel level unless agreed otherwise.' },
        { ru: 'Решения властей, перекрытие дорог, стихийные бедствия — форс-мажор, за который Madinah Group не отвечает.', uz: 'Hokimiyat qarorlari, yo‘llarning yopilishi, tabiiy ofatlar — fors-major, buning uchun Madinah Group javob bermaydi.', en: 'Government decisions, road closures and natural disasters are force majeure, for which Madinah Group is not liable.' }
      ],
      consent: {
        ru: 'Я согласен(на) с условиями аренды машины: осмотр при выдаче, штрафы и повреждения в период аренды — за мой счёт.',
        uz: 'Avtomobil ijarasi shartlariga roziman: berishda ko‘rik, ijara davridagi jarimalar va shikastlar — mening hisobimdan.',
        en: 'I accept the car rental terms: inspection at handover; fines and damage during the rental are at my expense.'
      }
    }
  },

  /* --- Оферта: условия аренды и разбор форс-мажоров ---------------------- */
  offer: {
    version: '2.0',
    updated: '2026-09-21',
    intro: {
      ru: 'Это условия, по которым проходит бронь. Галочка в заявке означает, что вы с ними согласны. ' +
          'Главное: честно укажите, кто и сколько человек будет жить; аренда идёт с дня передачи оплаты владельцу; я только связываю вас с владельцем и заселяю — после заселения все вопросы по квартире решаются с ним.',
      uz: 'Bu bron shartlari. Arizadagi belgi ular bilan roziligingizni bildiradi. ' +
          'Asosiysi: kim va necha kishi yashashini to‘g‘ri yozing; ijara to‘lov uy egasiga topshirilgan kundan hisoblanadi; men faqat sizni uy egasi bilan bog‘layman va joylashtiraman — keyin barcha masalalar u bilan hal qilinadi.',
      en: 'These are the booking terms. Ticking the box in the request means you accept them. ' +
          'In short: state honestly who and how many will live there; the rent runs from the day the payment reaches the owner; I only connect you with the owner and settle you in — after move-in, all questions are settled with the owner.'
    },
    sections: [
      {
        icon: 'handshake',
        title: { ru: 'Роль риелтора и ответственность', uz: 'Rieltorning o‘rni va javobgarligi', en: 'The realtor’s role and liability' },
        items: [
          { ru: 'Я риелтор-посредник: подбираю квартиру, показываю её и помогаю договориться с владельцем. Квартира принадлежит не мне.', uz: 'Men rieltor-vositachiman: kvartira tanlayman, ko‘rsataman va uy egasi bilan kelishishga yordam beraman. Kvartira menga tegishli emas.', en: 'I am a realtor and intermediary: I find the apartment, show it and help you agree with the owner. The apartment does not belong to me.' },
          { ru: 'Моя работа завершена, когда вы заселились и получили ключи. Дальше все вопросы по квартире — между вами и владельцем.', uz: 'Siz ko‘chib kirib, kalitni olganingizda mening ishim tugaydi. Keyingi barcha masalalar — siz bilan uy egasi o‘rtasida.', en: 'My job is done once you have moved in and received the keys. From then on, all questions about the apartment are between you and the owner.' },
          { ru: 'Риелтор не отвечает за решения владельца, его отказ, споры и конфликты с ним, поломки и состояние квартиры после заселения.', uz: 'Rieltor uy egasining qarorlari, rad javobi, u bilan bo‘ladigan nizolar, ko‘chib kirgandan keyingi buzilishlar va kvartira holati uchun javob bermaydi.', en: 'The realtor is not liable for the owner’s decisions or refusal, disputes with the owner, breakdowns or the condition of the apartment after move-in.' },
          { ru: 'Комиссия риелтора платится один раз и не возвращается. Сумма указана в карточке квартиры.', uz: 'Rieltor haqi bir marta to‘lanadi va qaytarilmaydi. Summasi kvartira kartochkasida.', en: 'The realtor fee is paid once and is non-refundable. The amount is shown on the apartment card.' }
        ]
      },
      {
        icon: 'people',
        title: { ru: 'Кто заселяется', uz: 'Kim yashaydi', en: 'Who moves in' },
        items: [
          { ru: 'В заявке вы указываете, кто будет жить: семья, братья или сёстры, и сколько всего человек, включая детей.', uz: 'Arizada kim yashashini ko‘rsatasiz: oila, birodarlar yoki opa-singillar va bolalar bilan birga jami necha kishi.', en: 'In the request you state who will live there — a family, brothers or sisters — and how many people in total, including children.' },
          { ru: 'Многие владельцы сдают только семьям или ограничивают число жильцов. Состав передаётся владельцу до брони.', uz: 'Ko‘p uy egalari faqat oilaga beradi yoki yashovchilar sonini cheklaydi. Tarkib bron qilishdan oldin uy egasiga yetkaziladi.', en: 'Many owners rent only to families or limit the number of residents. The list of residents is passed to the owner before booking.' },
          { ru: 'Если приедут не те или больше, чем указано в заявке — например, вместо семьи студенты или вместо двоих восемь, — это нарушение условий. Владелец вправе не заселить, сумма брони аннулируется и остаётся владельцу: он держал квартиру и никого не заселял. Остальное, если вы платили больше брони, возвращает владелец. Риелтор эти деньги себе не оставляет и ответственности не несёт.', uz: 'Agar arizada ko‘rsatilganlar emas yoki ko‘proq odam kelsa — masalan, oila o‘rniga talabalar yoki ikki kishi o‘rniga sakkiz kishi, — bu shartlarni buzish. Uy egasi joylashtirmaslikka haqli, bron summasi bekor qilinadi va uy egasida qoladi: u kvartirani saqlab, hech kimni joylashtirmagan. Brondan ortiq to‘lagan bo‘lsangiz, qolganini uy egasi qaytaradi. Rieltor bu pulni o‘ziga olmaydi va javob bermaydi.', en: 'If different or more people arrive than stated in the request — for example, students instead of a family, or eight people instead of two — the terms are broken. The owner may refuse to let them in, and the booking amount is cancelled and stays with the owner, who held the apartment and let no one else in. Anything you paid beyond the booking is returned by the owner. The realtor keeps none of this money and is not liable.' },
          { ru: 'Добавить жильцов позже можно только с согласия владельца.', uz: 'Keyinchalik yashovchi qo‘shish faqat uy egasining roziligi bilan.', en: 'Extra residents can only be added later with the owner’s consent.' }
        ]
      },
      {
        icon: 'wallet',
        title: { ru: 'Бронь и начало аренды', uz: 'Bron va ijara boshlanishi', en: 'Booking and start of the rent' },
        items: [
          { ru: 'Бронь — это оплата, которую я передаю владельцу. С этого дня квартира закреплена за вами.', uz: 'Bron — men uy egasiga topshiradigan to‘lov. Shu kundan kvartira sizga biriktiriladi.', en: 'The booking is the payment I pass on to the owner. From that day the apartment is held for you.' },
          { ru: 'Если бронируете заранее, аренда считается с дня, когда оплата передана владельцу, а не с дня приезда. Передали оплату 3-го, приехали 7-го — месяц всё равно идёт с 3-го.', uz: 'Oldindan bron qilsangiz, ijara kelgan kundan emas, to‘lov uy egasiga topshirilgan kundan hisoblanadi. To‘lov 3-sanada topshirilib, 7-sanada kelsangiz ham oy 3-sanadan boshlanadi.', en: 'If you book in advance, the rent runs from the day the payment reaches the owner, not from the day you arrive. Paid on the 3rd, arrived on the 7th — the month still starts on the 3rd.' },
          { ru: 'Деньги, переданные владельцу, возвращает только владелец и только по своему решению. Риелтор их не возвращает.', uz: 'Uy egasiga berilgan pulni faqat uy egasi va faqat o‘z qarori bilan qaytaradi. Rieltor qaytarmaydi.', en: 'Money passed to the owner can be returned only by the owner, at the owner’s discretion. The realtor does not refund it.' },
          { ru: 'Следующие платежи — в ту же дату месяца, что и бронь. Залог (та’мин) возвращает владелец при выезде, если квартира цела и счета оплачены.', uz: 'Keyingi to‘lovlar — bron sanasi bilan bir xil kunda. Garovni (ta’min) uy egasi chiqishda qaytaradi, agar kvartira butun va hisoblar to‘langan bo‘lsa.', en: 'Further payments fall on the same date of the month as the booking. The owner returns the deposit (ta’min) on move-out if the apartment is intact and the bills are paid.' }
        ]
      },
      {
        icon: 'home',
        title: { ru: 'Заселение: проверьте всё сразу', uz: 'Ko‘chib kirish: hammasini darhol tekshiring', en: 'Move-in: check everything at once' },
        items: [
          { ru: 'В день заезда проверьте кондиционеры, воду, свет, технику, мебель и замки.', uz: 'Kirgan kuningiz konditsioner, suv, svet, texnika, mebel va qulflarni tekshiring.', en: 'On move-in day, check the air conditioners, water, electricity, appliances, furniture and locks.' },
          { ru: 'Что сломано или испорчено — сфотографируйте и в тот же день отправьте владельцу и мне. Потом это будет спорно.', uz: 'Buzilgan yoki shikastlangan narsani suratga oling va o‘sha kuni uy egasiga va menga yuboring. Keyin bu bahsli bo‘ladi.', en: 'Photograph anything broken or damaged and send it to the owner and to me the same day. Later it will be disputable.' },
          { ru: 'После заселения поломки и ремонт решаются с владельцем напрямую — риелтор за них не отвечает.', uz: 'Ko‘chib kirgandan keyin buzilish va ta’mir uy egasi bilan to‘g‘ridan-to‘g‘ri hal qilinadi — rieltor javob bermaydi.', en: 'After move-in, breakdowns and repairs are settled directly with the owner — the realtor is not responsible for them.' },
          { ru: 'Показания счётчика записываем в день заезда. О выезде предупреждайте владельца заранее, по договору.', uz: 'Hisoblagich ko‘rsatkichi kirgan kuni yoziladi. Chiqish haqida uy egasini shartnomaga ko‘ra oldindan ogohlantiring.', en: 'The meter reading is recorded on move-in day. Give the owner notice before moving out, as the contract says.' }
        ]
      },
      {
        icon: 'force',
        title: { ru: 'Форс-мажор', uz: 'Fors-major', en: 'Force majeure' },
        items: [
          { ru: 'Землетрясение, пожар, наводнение, эпидемия, война, решения властей, закрытие границ — обстоятельства, на которые никто не может повлиять.', uz: 'Zilzila, yong‘in, suv toshqini, epidemiya, urush, hokimiyat qarorlari, chegaralar yopilishi — hech kim ta’sir qila olmaydigan holatlar.', en: 'Earthquakes, fires, floods, epidemics, war, government decisions, border closures — circumstances no one can control.' },
          { ru: 'Сюда же относятся задержка или отмена рейса, отказ в визе, болезнь и другие личные обстоятельства жильца.', uz: 'Bunga reysning kechikishi yoki bekor qilinishi, viza berilmasligi, kasallik va yashovchining boshqa shaxsiy holatlari ham kiradi.', en: 'This also covers flight delays or cancellations, visa refusals, illness and other personal circumstances of the tenant.' },
          { ru: 'В таких случаях риелтор ответственности не несёт. Бронь не переносится автоматически; вопрос денег решается с владельцем по договору.', uz: 'Bunday hollarda rieltor javob bermaydi. Bron avtomatik ko‘chirilmaydi; pul masalasi uy egasi bilan shartnoma bo‘yicha hal qilinadi.', en: 'In such cases the realtor is not liable. The booking is not moved automatically; money matters are settled with the owner under the contract.' }
        ]
      },
      {
        icon: 'key',
        title: { ru: 'Что входит в аренду', uz: 'Ijaraga nima kiradi', en: 'What the rent includes' },
        items: [
          { ru: 'В карточке каждой квартиры перечислено, что уже в цене, а что платится отдельно — свет, вода, газ, интернет.', uz: 'Har bir kvartira kartochkasida narxga nima kirgani va nima alohida to‘lanishi yozilgan — svet, suv, gaz, internet.', en: 'Each apartment card lists what is already in the price and what is paid separately — electricity, water, gas, internet.' },
          { ru: 'Мебель и техника на фото и видео остаются в квартире. Если чего-то нет — скажите до брони.', uz: 'Surat va videodagi mebel va texnika kvartirada qoladi. Biror narsa yo‘q bo‘lsa — brondan oldin ayting.', en: 'Furniture and appliances shown in the photos and videos stay in the apartment. If something is missing, say so before booking.' },
          { ru: 'Постельное бельё, посуда и мелочи — по договорённости с владельцем.', uz: 'Choyshab, idish-tovoq va mayda narsalar — uy egasi bilan kelishuv bo‘yicha.', en: 'Bed linen, dishes and small items are by agreement with the owner.' }
        ]
      },
      {
        icon: 'doc',
        title: { ru: 'Документы и икама', uz: 'Hujjatlar va iqoma', en: 'Documents and iqama' },
        items: [
          { ru: 'Для большинства квартир икама не нужна — достаточно паспорта. Где нужна, это написано в карточке.', uz: 'Ko‘p kvartiralar uchun iqoma shart emas — pasport yetadi. Kerak bo‘lsa, kartochkada yozilgan.', en: 'Most apartments do not need an iqama — a passport is enough. Where one is required, the card says so.' },
          { ru: 'Договор на арабском — я перевожу пункты до подписи. Не передавайте деньги без расписки или чека.', uz: 'Shartnoma arab tilida — imzolashdan oldin bandlarni tarjima qilaman. Tilxat yoki cheksiz pul bermang.', en: 'The contract is in Arabic — I translate the clauses before you sign. Do not hand over money without a receipt.' }
        ]
      }
    ],

    cases: {
      title: { ru: 'Спорные ситуации', uz: 'Bahsli holatlar', en: 'Disputed situations' },
      note: {
        ru: 'Такое уже случалось. Здесь сразу написано, как это решается.',
        uz: 'Bunday holatlar bo‘lgan. Qanday hal qilinishi shu yerda yozilgan.',
        en: 'These have happened before. Here is how each one is settled.'
      },
      list: [
        {
          q: { ru: 'Приехали не те или больше, чем указано в заявке', uz: 'Arizada ko‘rsatilganlardan boshqa yoki ko‘proq odam keldi', en: 'Different or more people arrived than stated in the request' },
          a: { ru: 'Например, бронировали как семья, а приехали студенты, или заявили двоих, а приехало восемь. Владелец вправе не заселить. Сумма брони остаётся владельцу, остальное он возвращает. Риелтор эти деньги себе не берёт и ответственности не несёт. Поэтому состав жильцов указывается честно заранее.',
               uz: 'Masalan, oila sifatida bron qilib, talabalar keldi yoki ikki kishi deb, sakkiz kishi keldi. Uy egasi joylashtirmaslikka haqli. Bron summasi uy egasida qoladi, qolganini u qaytaradi. Rieltor bu pulni olmaydi va javob bermaydi. Shuning uchun tarkib oldindan to‘g‘ri ko‘rsatiladi.',
               en: 'For example, booked as a family but students arrived, or stated two people but eight came. The owner may refuse. The booking amount stays with the owner, who returns the rest. The realtor takes none of this money and is not liable. That is why the residents are stated honestly in advance.' }
        },
        {
          q: { ru: 'Забронировали раньше, а приехали позже', uz: 'Oldinroq bron qilib, keyinroq keldik', en: 'Booked earlier, arrived later' },
          a: { ru: 'Аренда идёт с дня, когда оплата передана владельцу. Дни до приезда не переносятся и не возвращаются: оплата 3-го, приезд 7-го — оплаченный месяц заканчивается 3-го следующего месяца.',
               uz: 'Ijara to‘lov uy egasiga topshirilgan kundan hisoblanadi. Kelguningizcha o‘tgan kunlar ko‘chirilmaydi va qaytarilmaydi: to‘lov 3-sanada, kelish 7-sanada — to‘langan oy keyingi oyning 3-sanasida tugaydi.',
               en: 'The rent runs from the day the payment reaches the owner. Days before arrival are not moved or refunded: paid on the 3rd, arrived on the 7th — the paid month ends on the 3rd of the next month.' }
        },
        {
          q: { ru: 'После заселения что-то сломалось', uz: 'Ko‘chib kirgandan keyin biror narsa buzildi', en: 'Something broke after move-in' },
          a: { ru: 'Пишите владельцу — ремонт на нём. Риелтор после заселения за технику и состояние квартиры не отвечает. Поэтому всё проверяйте и фотографируйте в день заезда.',
               uz: 'Uy egasiga yozing — ta’mir unga tegishli. Rieltor ko‘chib kirgandan keyin texnika va kvartira holati uchun javob bermaydi. Shuning uchun hammasini kirgan kuni tekshiring va suratga oling.',
               en: 'Write to the owner — repairs are the owner’s job. After move-in the realtor is not responsible for appliances or the apartment’s condition. So check and photograph everything on move-in day.' }
        },
        {
          q: { ru: 'Конфликт с владельцем', uz: 'Uy egasi bilan nizo', en: 'A conflict with the owner' },
          a: { ru: 'Решается между вами и владельцем по договору. Я могу подсказать, как лучше поступить, но ответственности за решения владельца не несу.',
               uz: 'Siz bilan uy egasi o‘rtasida shartnoma bo‘yicha hal qilinadi. Qanday yo‘l tutishni maslahat berishim mumkin, lekin uy egasining qarorlari uchun javob bermayman.',
               en: 'It is settled between you and the owner under the contract. I can advise, but I am not liable for the owner’s decisions.' }
        },
        {
          q: { ru: 'Владелец просит съехать раньше срока', uz: 'Uy egasi muddatdan oldin chiqishni so‘rayapti', en: 'The owner asks you to leave early' },
          a: { ru: 'Это вопрос договора между вами и владельцем, включая возврат денег за неиспользованные дни. Риелтор за решения владельца не отвечает.',
               uz: 'Bu siz bilan uy egasi o‘rtasidagi shartnoma masalasi, ishlatilmagan kunlar uchun pulni qaytarish ham. Rieltor uy egasining qarorlari uchun javob bermaydi.',
               en: 'That is a matter of the contract between you and the owner, including any refund for unused days. The realtor is not liable for the owner’s decisions.' }
        },
        {
          q: { ru: 'Не дали визу или сдвинулся рейс', uz: 'Viza berilmadi yoki reys surildi', en: 'Visa refused or flight moved' },
          a: { ru: 'Бронь не сдвигается: аренда идёт с даты брони. Вернуть деньги может только владелец, по своему решению.',
               uz: 'Bron surilmaydi: ijara bron sanasidan hisoblanadi. Pulni faqat uy egasi o‘z qarori bilan qaytarishi mumkin.',
               en: 'The booking does not move: the rent runs from the booking date. Only the owner can return money, at the owner’s discretion.' }
        },
        {
          q: { ru: 'Отключили воду или свет во всём районе', uz: 'Butun hududda suv yoki svet o‘chdi', en: 'Water or electricity is off in the whole area' },
          a: { ru: 'Это городская авария. Деньги за такие дни не возвращаются — ни владельцем, ни риелтором.',
               uz: 'Bu shahar avariyasi. Bunday kunlar uchun pul qaytarilmaydi — na uy egasi, na rieltor tomonidan.',
               en: 'This is a city outage. Money for those days is not refunded — neither by the owner nor by the realtor.' }
        },
        {
          q: { ru: 'В Рамадан подняли цену', uz: 'Ramazonda narx ko‘tarildi', en: 'The price went up for Ramadan' },
          a: { ru: 'В Рамадан и хадж цены в Медине растут. Если период уже оплачен, цена внутри него не меняется. Повышение возможно при продлении.',
               uz: 'Ramazon va hajda Madinada narxlar ko‘tariladi. Davr to‘langan bo‘lsa, uning ichida narx o‘zgarmaydi. Uzaytirishda ko‘tarilishi mumkin.',
               en: 'Prices in Madinah rise during Ramadan and Hajj. If the period is already paid, the price does not change within it. An increase is possible when you extend.' }
        },
        {
          q: { ru: 'Квартира не как на фото', uz: 'Kvartira suratdagidek emas', en: 'The apartment is not like the photos' },
          a: { ru: 'Фото и видео — из самой квартиры. Если сомневаетесь, попросите видеообход до оплаты. После брони и заселения такие претензии не принимаются.',
               uz: 'Surat va videolar aynan o‘sha kvartiradan. Shubha bo‘lsa, to‘lovdan oldin video ko‘rik so‘rang. Bron va ko‘chib kirgandan keyin bunday e’tirozlar qabul qilinmaydi.',
               en: 'The photos and videos are of the apartment itself. If in doubt, ask for a video walkthrough before paying. After booking and move-in such claims are not accepted.' }
        }
      ]
    },

    /* коротко — показывается прямо в заявке над галочкой */
    keyPoints: [
      { ru: 'Состав и число жильцов указаны верно. Приедут другие или больше — владелец вправе не заселить, сумма брони остаётся ему.', uz: 'Yashovchilar tarkibi va soni to‘g‘ri ko‘rsatildi. Boshqalar yoki ko‘proq odam kelsa — uy egasi joylashtirmasligi mumkin, bron summasi unda qoladi.', en: 'The residents and their number are stated correctly. If others or more arrive, the owner may refuse and the booking amount stays with the owner.' },
      { ru: 'Аренда идёт с дня, когда оплата передана владельцу, а не с дня приезда.', uz: 'Ijara kelgan kundan emas, to‘lov uy egasiga topshirilgan kundan hisoblanadi.', en: 'The rent runs from the day the payment reaches the owner, not from the arrival day.' },
      { ru: 'После заселения поломки и споры решаются с владельцем. Риелтор ответственности не несёт.', uz: 'Ko‘chib kirgandan keyin buzilish va nizolar uy egasi bilan hal qilinadi. Rieltor javob bermaydi.', en: 'After move-in, breakdowns and disputes are settled with the owner. The realtor is not liable.' },
      { ru: 'Деньги, переданные владельцу, и комиссия риелтора не возвращаются.', uz: 'Uy egasiga berilgan pul va rieltor haqi qaytarilmaydi.', en: 'Money passed to the owner and the realtor fee are non-refundable.' }
    ],

    consent: {
      ru: 'Я согласен(на) с условиями брони: состав и число жильцов указаны верно, аренда идёт с дня передачи оплаты владельцу, после заселения вопросы по квартире решаются с владельцем.',
      uz: 'Bron shartlariga roziman: yashovchilar tarkibi va soni to‘g‘ri, ijara to‘lov uy egasiga topshirilgan kundan hisoblanadi, ko‘chib kirgandan keyin kvartira masalalari uy egasi bilan hal qilinadi.',
      en: 'I accept the booking terms: the residents and their number are stated correctly, the rent runs from the day the payment reaches the owner, and after move-in questions about the apartment are settled with the owner.'
    }
  },

  /* --- Как проходит сделка (шаги) ---------------------------------------- */
  steps: [
    { ru: 'Выбираете квартиру в каталоге и отправляете заявку', uz: 'Katalogdan kvartira tanlab, ariza yuborasiz', en: 'You choose an apartment in the catalogue and send a request' },
    { ru: 'Я отвечаю в личку: подтверждаю, что квартира свободна, и договариваюсь о показе', uz: 'Shaxsiy xabarda javob beraman: kvartira bo‘shligini tasdiqlab, ko‘rishga vaqt belgilaymiz', en: 'I reply in a private message: I confirm the apartment is free and arrange a viewing' },
    { ru: 'Показываю квартиру лично или отправляю видеообход, если вы ещё в пути', uz: 'Kvartirani o‘zim ko‘rsataman yoki yo‘lda bo‘lsangiz video aylanma yuboraman', en: 'I show the apartment in person, or send a video walkthrough if you are still on the way' },
    { ru: 'Подписываем договор с владельцем, я перевожу каждый пункт', uz: 'Uy egasi bilan shartnoma imzolaymiz, har bandni tarjima qilaman', en: 'We sign the contract with the owner, and I translate every clause' },
    { ru: 'Заселение: ключи, фото состояния, показания счётчика', uz: 'Joylashish: kalitlar, holat surati, hisoblagich ko‘rsatkichi', en: 'Move-in: keys, condition photos, meter reading' }
  ]
};
