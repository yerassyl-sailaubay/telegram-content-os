import type { AppLocale } from "./site";

export type SeoMetaCopy = {
  title: string;
  description: string;
  keywords: string[];
};

export type PageSection = {
  title: string;
  body: string[];
  bullets?: string[];
};

export type PageCta = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

export type PublicPageContent = {
  path: string;
  meta: SeoMetaCopy;
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  highlights: string[];
  sections: PageSection[];
  cta: PageCta;
};

type LocalizedCopy<T> = Record<AppLocale, T>;

export type SolutionSlug =
  | "telegram-post-scheduler"
  | "telegram-content-calendar"
  | "telegram-channel-management";

export type TrustPageSlug = "about" | "contact" | "privacy" | "terms";

type SolutionPageDefinition = {
  slug: SolutionSlug;
  path: string;
  preview: LocalizedCopy<{
    label: string;
    title: string;
    description: string;
    cta: string;
  }>;
  content: LocalizedCopy<PublicPageContent>;
};

type TrustPageDefinition = {
  slug: TrustPageSlug;
  path: string;
  navLabel: LocalizedCopy<string>;
  content: (supportEmail?: string) => LocalizedCopy<PublicPageContent>;
};

export const homeSeoCopy: LocalizedCopy<SeoMetaCopy> = {
  en: {
    title: "Telegram Post Scheduler and Content OS for Creators | Teleflow",
    description:
      "Capture ideas from Telegram, turn them into drafts, schedule posts, and track performance in one workflow built for channel owners, media teams, and agencies.",
    keywords: [
      "telegram post scheduler",
      "telegram content management",
      "telegram content calendar",
      "telegram automation for creators",
      "telegram analytics tool",
    ],
  },
  ru: {
    title: "Планировщик постов и контент-система для Telegram-каналов | Teleflow",
    description:
      "Собирайте идеи из Telegram, превращайте их в готовые посты, планируйте публикации и смотрите аналитику в одном рабочем процессе для авторов, команд и агентств.",
    keywords: [
      "планировщик постов telegram",
      "ведение telegram канала",
      "контент система для telegram",
      "контент календарь telegram",
      "управление telegram каналом",
    ],
  },
};

export const marketingChromeCopy: LocalizedCopy<{
  homeLabel: string;
  solutionsLabel: string;
  trustLabel: string;
  loginLabel: string;
  signupLabel: string;
  exploreLabel: string;
  legalLabel: string;
  useCasesTitle: string;
  useCasesDescription: string;
}> = {
  en: {
    homeLabel: "Home",
    solutionsLabel: "Solutions",
    trustLabel: "Trust",
    loginLabel: "Log in",
    signupLabel: "Start free",
    exploreLabel: "Explore use cases",
    legalLabel: "Company",
    useCasesTitle: "Choose the Telegram workflow problem you want to fix first.",
    useCasesDescription:
      "These pages target the exact jobs creators search for when manual channel management starts breaking down.",
  },
  ru: {
    homeLabel: "Главная",
    solutionsLabel: "Решения",
    trustLabel: "Доверие",
    loginLabel: "Войти",
    signupLabel: "Начать бесплатно",
    exploreLabel: "Сценарии для Telegram",
    legalLabel: "О продукте",
    useCasesTitle: "Выберите, какую проблему Telegram-процесса нужно закрыть в первую очередь.",
    useCasesDescription:
      "Эти страницы закрывают те самые сценарии, которые ищут авторы, когда ручное ведение канала перестаёт работать.",
  },
};

const solutionPages: Record<SolutionSlug, SolutionPageDefinition> = {
  "telegram-post-scheduler": {
    slug: "telegram-post-scheduler",
    path: "/solutions/telegram-post-scheduler",
    preview: {
      en: {
        label: "Scheduler",
        title: "Telegram post scheduler",
        description:
          "Keep queue, cadence, and recurring slots in one workflow instead of juggling Telegram drafts and spreadsheets.",
        cta: "Explore scheduler",
      },
      ru: {
        label: "Планирование",
        title: "Планировщик постов для Telegram",
        description:
          "Держите очередь публикаций, слоты и ритм выхода постов в одной системе вместо таблиц и ручных напоминаний.",
        cta: "Открыть страницу",
      },
    },
    content: {
      en: {
        path: "/solutions/telegram-post-scheduler",
        meta: {
          title: "Telegram Post Scheduler for Channel Owners | Teleflow",
          description:
            "Schedule Telegram posts, keep recurring publishing slots alive, and connect drafting with execution in one calendar-driven workflow.",
          keywords: [
            "telegram post scheduler",
            "schedule telegram posts",
            "telegram scheduling tool",
            "telegram publishing workflow",
          ],
        },
        eyebrow: "Scheduling workflow",
        heroTitle: "Run your Telegram publishing rhythm without spreadsheet chaos.",
        heroDescription:
          "Teleflow combines queue management, AI drafting, recurring slots, and channel analytics so your publishing plan stops living across Telegram, notes, and disconnected calendars.",
        highlights: [
          "Queue, draft, and publish from one workspace",
          "Recurring slots for repeatable weekly cadence",
          "Analytics stay close to each scheduled post",
        ],
        sections: [
          {
            title: "What makes this different from a simple scheduler",
            body: [
              "A posting calendar only solves the final click. Telegram creators usually lose time before that: ideas live in saved messages, draft versions sit in docs, and publishing dates drift because no one owns the whole chain.",
              "Teleflow keeps capture, drafting, scheduling, and review inside one system so the plan actually survives contact with a busy week.",
            ],
            bullets: [
              "Capture ideas directly from Telegram",
              "Turn raw inputs into queue-ready drafts",
              "Assign recurring slots and monitor gaps",
            ],
          },
          {
            title: "Who this page is for",
            body: [
              "This fits channel owners who already know they need consistency, but are tired of rebuilding the publishing plan from scratch every few days.",
            ],
            bullets: [
              "Solo creators running a serious content cadence",
              "Media teams publishing to multiple Telegram channels",
              "Agencies managing client posting operations",
            ],
          },
        ],
        cta: {
          title: "Start with the publishing workflow, not another disconnected tool.",
          description:
            "Create a workspace, connect Telegram, and turn your next batch of content into a living queue.",
          primaryLabel: "Create workspace",
          primaryHref: "/signup",
          secondaryLabel: "See pricing",
          secondaryHref: "/#pricing",
        },
      },
      ru: {
        path: "/solutions/telegram-post-scheduler",
        meta: {
          title: "Планировщик постов для Telegram-каналов | Teleflow",
          description:
            "Планируйте посты в Telegram, держите очередь публикаций и повторяющиеся слоты в одном рабочем процессе вместе с черновиками и аналитикой.",
          keywords: [
            "планировщик постов telegram",
            "расписание постов telegram",
            "автопостинг telegram канал",
            "очередь публикаций telegram",
          ],
        },
        eyebrow: "Планирование публикаций",
        heroTitle: "Ведите график Telegram-публикаций без хаоса из таблиц и черновиков.",
        heroDescription:
          "Teleflow соединяет очередь постов, генерацию черновиков, повторяющиеся слоты и аналитику канала, чтобы публикации больше не рассыпались между Telegram, заметками и календарями.",
        highlights: [
          "Очередь, черновики и публикация в одном месте",
          "Повторяющиеся слоты для стабильного ритма",
          "Аналитика рядом с контентом, а не отдельно",
        ],
        sections: [
          {
            title: "Почему это больше, чем обычный планировщик",
            body: [
              "Простой календарь закрывает только последний шаг. На практике авторы теряют время раньше: идеи висят в сохранённых сообщениях, тексты лежат в документах, а даты публикации постоянно сдвигаются.",
              "Teleflow собирает весь путь в одной системе: от входящего сигнала из Telegram до очереди публикаций и анализа результата.",
            ],
            bullets: [
              "Сбор идей прямо из Telegram",
              "Преобразование сырого материала в черновики",
              "Заполнение слотов и контроль пустот в расписании",
            ],
          },
          {
            title: "Кому подойдёт",
            body: [
              "Эта страница полезна тем, кто уже понимает ценность регулярности, но устал каждый раз собирать контент-план заново и держать всё в голове.",
            ],
            bullets: [
              "Авторам с плотным ритмом публикаций",
              "Медиа-командам с несколькими каналами",
              "Агентствам, ведущим Telegram для клиентов",
            ],
          },
        ],
        cta: {
          title: "Начните с рабочего процесса, а не с ещё одного отдельного инструмента.",
          description:
            "Создайте пространство, подключите Telegram и превратите следующий пакет идей в живую очередь публикаций.",
          primaryLabel: "Создать рабочее пространство",
          primaryHref: "/signup",
          secondaryLabel: "Посмотреть тарифы",
          secondaryHref: "/#pricing",
        },
      },
    },
  },
  "telegram-content-calendar": {
    slug: "telegram-content-calendar",
    path: "/solutions/telegram-content-calendar",
    preview: {
      en: {
        label: "Calendar",
        title: "Telegram content calendar",
        description:
          "Keep topic planning, publishing slots, and next actions visible so your content cadence stays realistic and repeatable.",
        cta: "Explore calendar",
      },
      ru: {
        label: "Контент-календарь",
        title: "Контент-календарь для Telegram",
        description:
          "Планируйте темы, публикационные окна и следующие шаги так, чтобы контентный ритм был реалистичным и повторяемым.",
        cta: "Открыть страницу",
      },
    },
    content: {
      en: {
        path: "/solutions/telegram-content-calendar",
        meta: {
          title: "Telegram Content Calendar for Creators | Teleflow",
          description:
            "Build a Telegram content calendar with recurring publishing slots, draft status visibility, and analytics-backed planning.",
          keywords: [
            "telegram content calendar",
            "telegram editorial calendar",
            "content planning for telegram",
            "telegram publishing calendar",
          ],
        },
        eyebrow: "Editorial planning",
        heroTitle: "Give your Telegram channel a calendar the team can actually trust.",
        heroDescription:
          "Teleflow keeps ideas, drafts, publishing slots, and performance signals in one calendar-friendly workflow so the content plan stays alive after the kickoff meeting.",
        highlights: [
          "Recurring rhythms for weekly publishing themes",
          "Draft status and queue visibility in one view",
          "Planning informed by performance, not guesses",
        ],
        sections: [
          {
            title: "Why Telegram creators need a real calendar",
            body: [
              "A content calendar is useful only when it stays close to the work. If the plan lives in a spreadsheet and the content lives somewhere else, the schedule becomes a document nobody trusts after the first busy week.",
              "Teleflow is designed to keep the plan and the execution in the same operating system.",
            ],
            bullets: [
              "See what is captured, drafted, scheduled, and published",
              "Spot empty slots before they hurt consistency",
              "Reuse strong themes and recurring formats",
            ],
          },
          {
            title: "Best fit",
            body: [
              "This workflow is useful when your Telegram strategy depends on recurring series, weekly rubrics, launches, or coordination across multiple contributors.",
            ],
            bullets: [
              "Creators with weekly educational series",
              "Teams running launches or promos",
              "Operators managing editorial cadence across channels",
            ],
          },
        ],
        cta: {
          title: "Turn your content plan into an operating system.",
          description:
            "Start with Telegram-native capture, then keep planning, drafting, and execution together.",
          primaryLabel: "Start free",
          primaryHref: "/signup",
          secondaryLabel: "View scheduler page",
          secondaryHref: "/solutions/telegram-post-scheduler",
        },
      },
      ru: {
        path: "/solutions/telegram-content-calendar",
        meta: {
          title: "Контент-календарь для Telegram-канала | Teleflow",
          description:
            "Планируйте Telegram-контент через календарь публикаций, повторяющиеся рубрики и статусы черновиков в одном интерфейсе.",
          keywords: [
            "контент календарь telegram",
            "контент план telegram канал",
            "редакционный календарь telegram",
            "планирование контента telegram",
          ],
        },
        eyebrow: "Редакционное планирование",
        heroTitle:
          "Соберите для Telegram-канала календарь, которому можно доверять в реальной работе.",
        heroDescription:
          "Teleflow держит идеи, черновики, публикационные слоты и сигналы аналитики в одном календарном процессе, чтобы контент-план не умирал после первой загруженной недели.",
        highlights: [
          "Повторяющиеся ритмы и рубрики на недели вперёд",
          "Статусы черновиков и очередь в одном окне",
          "Планирование, опирающееся на аналитику, а не догадки",
        ],
        sections: [
          {
            title: "Зачем Telegram-автору контент-календарь, а не просто таблица",
            body: [
              "Календарь полезен только тогда, когда он живёт рядом с работой. Если план лежит в таблице, а контент в других местах, уже через неделю расписание перестаёт отражать реальность.",
              "Teleflow создан так, чтобы планирование и исполнение находились в одной системе.",
            ],
            bullets: [
              "Видно, что уже собрано, написано, поставлено в очередь и опубликовано",
              "Пустые слоты заметны заранее, а не в день публикации",
              "Удачные темы и форматы легко повторять",
            ],
          },
          {
            title: "Для кого это особенно полезно",
            body: [
              "Такой подход нужен, если стратегия канала строится вокруг регулярных рубрик, запусков, серий постов и согласования между несколькими людьми.",
            ],
            bullets: [
              "Авторы с еженедельными сериями",
              "Команды, ведущие промо и запуски",
              "Операторы, управляющие редакционным ритмом сразу в нескольких каналах",
            ],
          },
        ],
        cta: {
          title: "Превратите контент-план в рабочую систему.",
          description:
            "Начните со сбора идей через Telegram, а затем держите планирование, генерацию и публикацию в одном процессе.",
          primaryLabel: "Начать бесплатно",
          primaryHref: "/signup",
          secondaryLabel: "Перейти к планировщику",
          secondaryHref: "/solutions/telegram-post-scheduler",
        },
      },
    },
  },
  "telegram-channel-management": {
    slug: "telegram-channel-management",
    path: "/solutions/telegram-channel-management",
    preview: {
      en: {
        label: "Operations",
        title: "Telegram channel management",
        description:
          "Manage idea intake, drafting, scheduling, and analytics across one or several channels without piecing together a manual stack.",
        cta: "Explore operations",
      },
      ru: {
        label: "Операции",
        title: "Управление Telegram-каналом",
        description:
          "Соберите приём идей, генерацию, планирование и аналитику одного или нескольких каналов в одной операционной системе.",
        cta: "Открыть страницу",
      },
    },
    content: {
      en: {
        path: "/solutions/telegram-channel-management",
        meta: {
          title: "Telegram Channel Management Workflow | Teleflow",
          description:
            "Manage Telegram channel operations across capture, drafting, scheduling, and analytics in one workflow built for creators and lean teams.",
          keywords: [
            "telegram channel management",
            "telegram management tool",
            "telegram workflow for creators",
            "telegram content operations",
          ],
        },
        eyebrow: "Channel operations",
        heroTitle: "Manage your Telegram channel like a system, not a daily scramble.",
        heroDescription:
          "Teleflow helps creators and teams move from disconnected tools to a repeatable workflow that handles intake, editorial work, publishing, and feedback loops together.",
        highlights: [
          "Telegram-first capture for raw ideas and source material",
          "AI drafting and adaptation without losing voice",
          "Publishing and analytics tied back to the same workflow",
        ],
        sections: [
          {
            title: "What channel management usually looks like",
            body: [
              "Most Telegram operations grow organically: saved messages for capture, docs for drafts, calendars for planning, and native Telegram analytics somewhere else. That stack works until volume grows or multiple people need visibility.",
              "Teleflow is built to reduce the handoffs that create friction, delays, and duplicated work.",
            ],
            bullets: [
              "Keep source material near the final output",
              "Reduce status ambiguity and last-minute scrambling",
              "Make analytics part of planning, not a separate ritual",
            ],
          },
          {
            title: "Operational fit",
            body: [
              "The product is a strong fit for channel owners who want a cleaner workflow and for lean teams that need a shared system without enterprise-level complexity.",
            ],
            bullets: [
              "Single-channel creators with growing volume",
              "Multi-channel operators",
              "Agencies and media teams managing approvals and cadence",
            ],
          },
        ],
        cta: {
          title: "Build the workflow before the chaos gets expensive.",
          description: "Use Teleflow to turn Telegram content operations into a repeatable system.",
          primaryLabel: "Create workspace",
          primaryHref: "/signup",
          secondaryLabel: "Review pricing",
          secondaryHref: "/#pricing",
        },
      },
      ru: {
        path: "/solutions/telegram-channel-management",
        meta: {
          title: "Управление Telegram-каналом без хаоса | Teleflow",
          description:
            "Управляйте сбором идей, генерацией постов, публикациями и аналитикой Telegram-канала в одной системе для авторов, команд и агентств.",
          keywords: [
            "управление telegram каналом",
            "ведение telegram канала",
            "система для telegram автора",
            "операционная система telegram контента",
          ],
        },
        eyebrow: "Операции канала",
        heroTitle: "Управляйте Telegram-каналом как системой, а не как ежедневным пожаром.",
        heroDescription:
          "Teleflow помогает авторам и командам перейти от набора разрозненных инструментов к повторяемому процессу, где сбор, редактура, публикация и обратная связь связаны между собой.",
        highlights: [
          "Telegram как входной слой для идей и материалов",
          "Генерация и адаптация без потери голоса",
          "Публикации и аналитика встроены в тот же процесс",
        ],
        sections: [
          {
            title: "Как обычно выглядит управление каналом",
            body: [
              "У большинства Telegram-команд процесс вырастает стихийно: сохранённые сообщения для идей, документы для черновиков, отдельные календари для планирования и аналитика Telegram где-то ещё. Пока объём небольшой, это работает. Потом всё начинает сыпаться.",
              "Teleflow сокращает лишние передачи между этапами, из-за которых появляются задержки, дублирование и постоянная ручная координация.",
            ],
            bullets: [
              "Исходные материалы остаются рядом с итоговым постом",
              "Меньше статусов «непонятно на каком этапе»",
              "Аналитика влияет на планирование следующего цикла",
            ],
          },
          {
            title: "Кому особенно подходит",
            body: [
              "Продукт особенно полезен авторам с растущим объёмом публикаций и небольшим командам, которым нужна общая система без тяжёлого enterprise-подхода.",
            ],
            bullets: [
              "Авторам одного канала с растущей нагрузкой",
              "Операторам нескольких каналов",
              "Агентствам и медиа-командам с согласованиями и графиком публикаций",
            ],
          },
        ],
        cta: {
          title: "Постройте процесс до того, как хаос станет дорогим.",
          description:
            "Используйте Teleflow, чтобы превратить ведение Telegram-контента в повторяемую систему.",
          primaryLabel: "Создать рабочее пространство",
          primaryHref: "/signup",
          secondaryLabel: "Посмотреть тарифы",
          secondaryHref: "/#pricing",
        },
      },
    },
  },
};

const trustPages: Record<TrustPageSlug, TrustPageDefinition> = {
  about: {
    slug: "about",
    path: "/about",
    navLabel: {
      en: "About",
      ru: "О продукте",
    },
    content: () => ({
      en: {
        path: "/about",
        meta: {
          title: "About Teleflow | Telegram Content Workflow",
          description:
            "Learn what Teleflow is, who it is for, and how it helps Telegram creators manage capture, drafting, scheduling, and analytics.",
          keywords: ["about teleflow", "telegram workflow software", "telegram creator tool"],
        },
        eyebrow: "About the product",
        heroTitle:
          "Teleflow is built for people who run Telegram channels like real editorial systems.",
        heroDescription:
          "The product is designed for creators, media teams, and agencies that are tired of stitching together saved messages, docs, calendars, and analytics by hand.",
        highlights: [
          "Telegram-first capture for source material",
          "Drafting and adaptation connected to publishing",
          "Scheduling and analytics kept inside the same workflow",
        ],
        sections: [
          {
            title: "What Teleflow does",
            body: [
              "Teleflow turns Telegram into the front door for content operations. Ideas, voice notes, links, and source material can be captured from the place creators already use every day.",
              "From there, the workflow moves into drafting, planning, publishing, and analysis without forcing teams to rebuild context between tools.",
            ],
          },
          {
            title: "Who it is for",
            body: [
              "The best fit is a Telegram creator or lean team that already has publishing momentum and now needs a cleaner operating system.",
            ],
            bullets: [
              "Solo creators with recurring publishing cadence",
              "Media teams coordinating channel output",
              "Agencies managing Telegram content for clients",
            ],
          },
        ],
        cta: {
          title: "See how the workflow works on the live product surface.",
          description:
            "Start free or review the core solution pages to understand how Teleflow fits your publishing process.",
          primaryLabel: "Start free",
          primaryHref: "/signup",
          secondaryLabel: "Explore solutions",
          secondaryHref: "/solutions/telegram-post-scheduler",
        },
      },
      ru: {
        path: "/about",
        meta: {
          title: "О Teleflow | Система для ведения Telegram-каналов",
          description:
            "Узнайте, как Teleflow помогает Telegram-авторам и командам объединить сбор идей, генерацию, публикации и аналитику.",
          keywords: ["о teleflow", "система для telegram канала", "инструмент для telegram автора"],
        },
        eyebrow: "О продукте",
        heroTitle:
          "Teleflow создан для тех, кто ведёт Telegram-канал как полноценную редакционную систему.",
        heroDescription:
          "Продукт рассчитан на авторов, медиа-команды и агентства, уставшие вручную склеивать сохранённые сообщения, документы, календари и аналитику.",
        highlights: [
          "Telegram как главный вход для материалов",
          "Генерация и адаптация связаны с публикациями",
          "Планирование и аналитика живут в одном процессе",
        ],
        sections: [
          {
            title: "Что делает Teleflow",
            body: [
              "Teleflow превращает Telegram во входную точку контент-операций. Идеи, голосовые, ссылки и исходные материалы можно собирать прямо там, где автор уже работает каждый день.",
              "Дальше процесс продолжается в генерации, планировании, публикации и анализе без постоянной потери контекста между разными инструментами.",
            ],
          },
          {
            title: "Для кого подходит",
            body: [
              "Лучший сценарий использования — Telegram-автор или небольшая команда, у которых уже есть темп публикаций и которым нужна более чистая операционная система.",
            ],
            bullets: [
              "Сольные авторы с регулярным графиком",
              "Медиа-команды, координирующие выпуск контента",
              "Агентства, ведущие Telegram для клиентов",
            ],
          },
        ],
        cta: {
          title: "Посмотрите, как этот процесс выглядит в продукте.",
          description:
            "Начните бесплатно или перейдите на страницы решений, чтобы понять, как Teleflow вписывается в ваш процесс публикаций.",
          primaryLabel: "Начать бесплатно",
          primaryHref: "/signup",
          secondaryLabel: "Открыть решения",
          secondaryHref: "/solutions/telegram-post-scheduler",
        },
      },
    }),
  },
  contact: {
    slug: "contact",
    path: "/contact",
    navLabel: {
      en: "Contact",
      ru: "Контакты",
    },
    content: (supportEmail) => ({
      en: {
        path: "/contact",
        meta: {
          title: "Contact Teleflow",
          description:
            "Contact Teleflow for product questions, partnerships, billing, or privacy requests related to Telegram content workflows.",
          keywords: ["contact teleflow", "teleflow support", "telegram workflow contact"],
        },
        eyebrow: "Contact",
        heroTitle: "Reach Teleflow for product, billing, or privacy questions.",
        heroDescription: supportEmail
          ? `The fastest contact channel right now is ${supportEmail}.`
          : "Use this page as the central contact point for product, billing, and privacy questions about Teleflow.",
        highlights: [
          "Product and partnership conversations",
          "Billing and account questions",
          "Privacy or data-related requests",
        ],
        sections: [
          {
            title: "How to get in touch",
            body: supportEmail
              ? [
                  `Email ${supportEmail} for product, billing, partnership, or privacy requests.`,
                  "If you are evaluating Teleflow, include a short note about your Telegram channel or workflow so the response can be more useful.",
                ]
              : [
                  "A dedicated support email has not been configured on this deployment yet.",
                  "Until that is added, the best next step is to create a workspace and use the product entry points on the site.",
                ],
          },
          {
            title: "What helps us respond faster",
            body: [
              "Share whether you run a solo channel, media team, or agency workflow, and describe the part of the process that is breaking today.",
            ],
            bullets: [
              "Current posting frequency",
              "Number of channels involved",
              "Where the workflow is getting stuck",
            ],
          },
        ],
        cta: {
          title: "Want to see the workflow before reaching out?",
          description: "Start free or review the scheduling and channel-management pages first.",
          primaryLabel: "Start free",
          primaryHref: "/signup",
          secondaryLabel: "Explore solutions",
          secondaryHref: "/solutions/telegram-channel-management",
        },
      },
      ru: {
        path: "/contact",
        meta: {
          title: "Контакты Teleflow",
          description:
            "Свяжитесь с Teleflow по вопросам продукта, партнёрств, биллинга или конфиденциальности для работы с Telegram-контентом.",
          keywords: ["контакты teleflow", "поддержка teleflow", "связаться по telegram workflow"],
        },
        eyebrow: "Контакты",
        heroTitle: "Свяжитесь с Teleflow по вопросам продукта, биллинга и конфиденциальности.",
        heroDescription: supportEmail
          ? `Сейчас самый быстрый канал связи — ${supportEmail}.`
          : "Эта страница служит центральной точкой контакта по вопросам продукта, биллинга и конфиденциальности Teleflow.",
        highlights: [
          "Вопросы по продукту и партнёрствам",
          "Биллинг и аккаунт",
          "Запросы по данным и конфиденциальности",
        ],
        sections: [
          {
            title: "Как связаться",
            body: supportEmail
              ? [
                  `Пишите на ${supportEmail} по вопросам продукта, партнёрств, биллинга и конфиденциальности.`,
                  "Если вы только оцениваете Teleflow, добавьте короткое описание вашего Telegram-канала или текущего процесса — так ответ будет полезнее.",
                ]
              : [
                  "На этом деплое пока не настроен отдельный адрес поддержки.",
                  "Пока его нет, лучший следующий шаг — создать рабочее пространство и пройти через основные продуктовые страницы сайта.",
                ],
          },
          {
            title: "Что поможет ответить быстрее",
            body: [
              "Опишите, работаете ли вы один, в медиа-команде или агентстве, и на каком этапе Telegram-процесс ломается чаще всего.",
            ],
            bullets: [
              "Текущая частота публикаций",
              "Количество каналов",
              "Где именно застревает процесс",
            ],
          },
        ],
        cta: {
          title: "Хотите сначала посмотреть сам процесс?",
          description:
            "Начните бесплатно или откройте страницы про планирование и управление каналом.",
          primaryLabel: "Начать бесплатно",
          primaryHref: "/signup",
          secondaryLabel: "Открыть решения",
          secondaryHref: "/solutions/telegram-channel-management",
        },
      },
    }),
  },
  privacy: {
    slug: "privacy",
    path: "/privacy",
    navLabel: {
      en: "Privacy",
      ru: "Конфиденциальность",
    },
    content: (supportEmail) => ({
      en: {
        path: "/privacy",
        meta: {
          title: "Privacy Policy | Teleflow",
          description:
            "Read how Teleflow handles account data, Telegram-connected content inputs, payments, analytics, and privacy-related requests.",
          keywords: ["teleflow privacy policy", "telegram content app privacy"],
        },
        eyebrow: "Privacy policy",
        heroTitle: "How Teleflow handles data related to your Telegram workflow.",
        heroDescription:
          "This page explains the categories of data Teleflow processes, why they are used, and how to request support on privacy-related questions.",
        highlights: [
          "Account, billing, and workflow data are processed to operate the service",
          "Third-party infrastructure is used for hosting, authentication, storage, and payments",
          "Privacy-related requests can be sent through the contact channel",
        ],
        sections: [
          {
            title: "What data may be processed",
            body: [
              "Teleflow may process account information, billing information, Telegram-connected workflow inputs, generated drafts, scheduled publishing data, and analytics needed to operate the service.",
              "The exact data available depends on which product features you use and which content you choose to submit into the workflow.",
            ],
          },
          {
            title: "Why data is used",
            body: [
              "Data is used to authenticate users, run content workflows, support publishing and scheduling features, measure usage, process payments, and improve service reliability.",
              "Teleflow also relies on service providers such as Supabase, Stripe, Vercel, and Telegram-related integrations to deliver the product.",
            ],
          },
          {
            title: "Requests and questions",
            body: [
              supportEmail
                ? `For privacy-related requests, contact ${supportEmail}.`
                : "Use the contact page for privacy-related requests associated with this deployment.",
              "When reaching out, include the email associated with your account and a short description of the request.",
            ],
          },
        ],
        cta: {
          title: "Need the product context behind this policy?",
          description:
            "Review the about page or contact page if you need more operational details.",
          primaryLabel: "About Teleflow",
          primaryHref: "/about",
          secondaryLabel: "Contact",
          secondaryHref: "/contact",
        },
      },
      ru: {
        path: "/privacy",
        meta: {
          title: "Политика конфиденциальности | Teleflow",
          description:
            "Узнайте, как Teleflow обрабатывает данные аккаунта, контент из Telegram, платежи, аналитику и запросы по конфиденциальности.",
          keywords: ["политика конфиденциальности teleflow", "privacy telegram контент"],
        },
        eyebrow: "Политика конфиденциальности",
        heroTitle: "Как Teleflow обращается с данными, связанными с вашим Telegram-процессом.",
        heroDescription:
          "На этой странице описаны категории данных, которые может обрабатывать Teleflow, причины такой обработки и способы обращения по вопросам конфиденциальности.",
        highlights: [
          "Для работы сервиса обрабатываются данные аккаунта, биллинга и контентного процесса",
          "Для хостинга, аутентификации, хранения и оплаты используются внешние провайдеры",
          "Запросы по конфиденциальности можно отправлять через контактный канал",
        ],
        sections: [
          {
            title: "Какие данные могут обрабатываться",
            body: [
              "Teleflow может обрабатывать данные аккаунта, биллинга, входящие материалы из Telegram, сгенерированные черновики, данные о запланированных публикациях и аналитику, необходимую для работы сервиса.",
              "Конкретный объём данных зависит от того, какие функции продукта вы используете и какой контент отправляете в систему.",
            ],
          },
          {
            title: "Зачем используются данные",
            body: [
              "Данные используются для аутентификации пользователей, работы контентных процессов, публикации и планирования, расчёта использования, обработки платежей и повышения надёжности сервиса.",
              "Для предоставления продукта Teleflow также использует сервисы Supabase, Stripe, Vercel и интеграции, связанные с Telegram.",
            ],
          },
          {
            title: "Запросы и вопросы",
            body: [
              supportEmail
                ? `По вопросам конфиденциальности пишите на ${supportEmail}.`
                : "Используйте страницу контактов для запросов, связанных с конфиденциальностью на этом деплое.",
              "При обращении укажите email аккаунта и коротко опишите сам запрос.",
            ],
          },
        ],
        cta: {
          title: "Нужен контекст продукта вокруг этой политики?",
          description:
            "Откройте страницу о продукте или контакты, если вам нужны дополнительные организационные детали.",
          primaryLabel: "О продукте",
          primaryHref: "/about",
          secondaryLabel: "Контакты",
          secondaryHref: "/contact",
        },
      },
    }),
  },
  terms: {
    slug: "terms",
    path: "/terms",
    navLabel: {
      en: "Terms",
      ru: "Условия использования",
    },
    content: () => ({
      en: {
        path: "/terms",
        meta: {
          title: "Terms of Service | Teleflow",
          description:
            "Read the main terms for using Teleflow, including accounts, acceptable use, billing, and responsibility for AI-assisted content workflows.",
          keywords: ["teleflow terms", "telegram workflow software terms"],
        },
        eyebrow: "Terms of service",
        heroTitle: "Core terms for using Teleflow.",
        heroDescription:
          "These terms summarize the baseline expectations around accounts, acceptable use, billing, and responsibility for the content you publish through the workflow.",
        highlights: [
          "Users remain responsible for the content they publish",
          "Paid plans and billing are governed by the active pricing setup",
          "Misuse, abuse, or unlawful activity is not permitted",
        ],
        sections: [
          {
            title: "Accounts and access",
            body: [
              "You are responsible for the security of your account and for keeping access credentials accurate.",
              "Teleflow may limit or suspend access when required to protect the service, comply with the law, or respond to abuse.",
            ],
          },
          {
            title: "Content and acceptable use",
            body: [
              "You remain responsible for source material, generated drafts, scheduled posts, and final published output that moves through your workflow.",
              "You agree not to use the service for unlawful, abusive, deceptive, or rights-infringing activity.",
            ],
          },
          {
            title: "Billing and service changes",
            body: [
              "Paid access, usage limits, and feature availability depend on the plan associated with your account.",
              "Pricing, limits, and product capabilities may evolve as the service changes.",
            ],
          },
        ],
        cta: {
          title: "Need product context before agreeing to terms?",
          description: "Read the product overview or pricing surface for the operational picture.",
          primaryLabel: "About Teleflow",
          primaryHref: "/about",
          secondaryLabel: "View pricing",
          secondaryHref: "/#pricing",
        },
      },
      ru: {
        path: "/terms",
        meta: {
          title: "Условия использования | Teleflow",
          description:
            "Прочитайте основные условия использования Teleflow: аккаунты, допустимое использование, биллинг и ответственность за AI-помощь в контент-процессе.",
          keywords: ["условия teleflow", "условия использования telegram workflow"],
        },
        eyebrow: "Условия использования",
        heroTitle: "Базовые условия работы с Teleflow.",
        heroDescription:
          "Эти условия описывают основные ожидания вокруг аккаунтов, допустимого использования, биллинга и ответственности за контент, который проходит через систему.",
        highlights: [
          "Пользователь отвечает за публикуемый контент",
          "Платные планы и биллинг зависят от текущей тарифной конфигурации",
          "Злоупотребление сервисом и незаконная активность запрещены",
        ],
        sections: [
          {
            title: "Аккаунты и доступ",
            body: [
              "Вы отвечаете за безопасность аккаунта и актуальность данных для доступа.",
              "Teleflow может ограничить или приостановить доступ, если это нужно для защиты сервиса, соблюдения закона или реакции на злоупотребление.",
            ],
          },
          {
            title: "Контент и допустимое использование",
            body: [
              "Вы несёте ответственность за исходные материалы, сгенерированные черновики, запланированные посты и финальный контент, проходящий через ваш процесс.",
              "Нельзя использовать сервис для незаконной, вводящей в заблуждение, нарушающей права или злоупотребляющей деятельности.",
            ],
          },
          {
            title: "Биллинг и изменения сервиса",
            body: [
              "Платный доступ, лимиты использования и набор функций зависят от тарифа, привязанного к вашему аккаунту.",
              "Цены, лимиты и возможности продукта могут меняться по мере развития сервиса.",
            ],
          },
        ],
        cta: {
          title: "Нужен продуктовый контекст до согласия с условиями?",
          description:
            "Откройте страницу о продукте или тарифы, чтобы увидеть операционную картину целиком.",
          primaryLabel: "О продукте",
          primaryHref: "/about",
          secondaryLabel: "Посмотреть тарифы",
          secondaryHref: "/#pricing",
        },
      },
    }),
  },
};

export function getSolutionSlugs() {
  return Object.keys(solutionPages) as SolutionSlug[];
}

export function isSolutionSlug(slug: string): slug is SolutionSlug {
  return getSolutionSlugs().includes(slug as SolutionSlug);
}

export function getSolutionPage(slug: SolutionSlug, locale: AppLocale) {
  return solutionPages[slug].content[locale];
}

export function getTrustPage(slug: TrustPageSlug, locale: AppLocale, supportEmail?: string) {
  return trustPages[slug].content(supportEmail)[locale];
}

export function getSolutionPreviewCards(locale: AppLocale) {
  return getSolutionSlugs().map((slug) => ({
    href: solutionPages[slug].path,
    ...solutionPages[slug].preview[locale],
  }));
}

export function getFooterSolutionLinks(locale: AppLocale) {
  return getSolutionSlugs().map((slug) => ({
    href: solutionPages[slug].path,
    label: solutionPages[slug].preview[locale].title,
  }));
}

export function getFooterTrustLinks(locale: AppLocale) {
  return (Object.keys(trustPages) as TrustPageSlug[]).map((slug) => ({
    href: trustPages[slug].path,
    label: trustPages[slug].navLabel[locale],
  }));
}
