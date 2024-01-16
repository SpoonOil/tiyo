import {
  GetSeriesFunc,
  GetChaptersFunc,
  GetPageRequesterDataFunc,
  GetFilterOptionsFunc,
  GetPageUrlsFunc,
  GetSearchFunc,
  GetImageFunc,
  PageRequesterData,
  GetDirectoryFunc,
  GetSettingsFunc,
  SetSettingsFunc,
  GetSettingTypesFunc,
  Chapter,
  LanguageKey,
  Series,
  SeriesStatus,
} from '@tiyo/common';

const LANGUAGE_MAP: { [key: string]: LanguageKey } = {
  ar: LanguageKey.ARABIC,
  bg: LanguageKey.BULGARIAN,
  ca: LanguageKey.CATALAN,
  zh: LanguageKey.CHINESE_SIMP,
  cs: LanguageKey.CZECH,
  da: LanguageKey.DANISH,
  nl: LanguageKey.DUTCH,
  en: LanguageKey.ENGLISH,
  fi: LanguageKey.FINNISH,
  fr: LanguageKey.FRENCH,
  de: LanguageKey.GERMAN,
  el: LanguageKey.GREEK,
  he: LanguageKey.HEBREW,
  hi: LanguageKey.HINDI,
  hu: LanguageKey.HUNGARIAN,
  id: LanguageKey.INDONESIAN,
  it: LanguageKey.ITALIAN,
  ja: LanguageKey.JAPANESE,
  ko: LanguageKey.KOREAN,
  lt: LanguageKey.LITHUANIAN,
  ms: LanguageKey.MALAY,
  pl: LanguageKey.POLISH,
  pt: LanguageKey.PORTUGUESE_PT,
  ro: LanguageKey.ROMANIAN,
  ru: LanguageKey.RUSSIAN,
  es: LanguageKey.SPANISH_ES,
  sv: LanguageKey.SWEDISH,
  th: LanguageKey.THAI,
  tr: LanguageKey.TURKISH,
  uk: LanguageKey.UKRAINIAN,
  vi: LanguageKey.VIETNAMESE,
};

const SERIES_STATUS_MAP: { [key: string]: SeriesStatus } = {
  'In cors': SeriesStatus.ONGOING,
  'On goin': SeriesStatus.ONGOING,
  Complet: SeriesStatus.COMPLETED,
  Conclus: SeriesStatus.COMPLETED,
  Conclud: SeriesStatus.COMPLETED,
};

export class PizzaReaderClient {
  extensionId: string;
  baseUrl: string;

  constructor(extensionId: string, baseUrl: string) {
    this.extensionId = extensionId;
    this.baseUrl = baseUrl;
  }

  _parseSeries = (entry: any): Series => {
    return {
      id: undefined,
      extensionId: this.extensionId,
      sourceId: entry.slug,

      title: entry.title,
      altTitles: entry.alt_titles,
      description: entry.description,
      authors: [entry.author],
      artists: [entry.artist],
      tags: entry.genres ? entry.genres.map((genre: any) => genre.name) : [],
      status: SERIES_STATUS_MAP[entry.status.substr(0, 7)] || SeriesStatus.ONGOING,
      originalLanguageKey: LanguageKey.JAPANESE,
      numberUnread: 0,
      remoteCoverUrl: entry.thumbnail,
    };
  };

  getSeries: GetSeriesFunc = (id: string) => {
    return fetch(`${this.baseUrl}/api/comics/${id}`)
      .then((response: Response) => response.json())
      .then((data: any) => {
        return this._parseSeries(data.comic);
      });
  };

  getChapters: GetChaptersFunc = (id: string) => {
    return fetch(`${this.baseUrl}/api/comics/${id}`)
      .then((response: Response) => response.json())
      .then((data: any) => {
        return data.comic.chapters.map(
          (entry: any) =>
            ({
              id: undefined,
              seriesId: undefined,
              sourceId: entry.url,
              title: entry.title || '',
              chapterNumber: entry.chapter || '',
              volumeNumber: entry.volume || '',
              languageKey: LANGUAGE_MAP[entry.language],
              groupName: entry.teams && entry.teams.length > 0 ? entry.teams[0].name : '',
              time: new Date(entry.published_on).getTime(),
              read: false,
            } as Chapter)
        );
      });
  };

  getPageRequesterData: GetPageRequesterDataFunc = (
    seriesSourceId: string,
    chapterSourceId: string
  ) => {
    return fetch(`${this.baseUrl}/api${chapterSourceId}`)
      .then((response: Response) => response.json())
      .then((data: any) => {
        const pageUrls = data.chapter.pages;
        return {
          server: '',
          hash: '',
          numPages: pageUrls.length,
          pageFilenames: pageUrls,
        };
      });
  };

  getPageUrls: GetPageUrlsFunc = (pageRequesterData: PageRequesterData) => {
    return pageRequesterData.pageFilenames;
  };

  getImage: GetImageFunc = (series: Series, url: string) => {
    return new Promise((resolve, _reject) => {
      resolve(url);
    });
  };

  getSearch: GetSearchFunc = (text: string, page: number) => {
    return fetch(`${this.baseUrl}/api/search/${text}`)
      .then((response: Response) => response.json())
      .then((data: any) => {
        const seriesList = data.comics.map((entry: any) => this._parseSeries(entry));
        return {
          seriesList,
          hasMore: false,
        };
      });
  };

  getDirectory: GetDirectoryFunc = (page: number) => {
    return fetch(`${this.baseUrl}/api/comics`)
      .then((response: Response) => response.json())
      .then((data: any) => {
        const seriesList = data.comics.map((entry: any) => this._parseSeries(entry));
        return {
          seriesList,
          hasMore: false,
        };
      });
  };

  getSettingTypes: GetSettingTypesFunc = () => {
    return {};
  };

  getSettings: GetSettingsFunc = () => {
    return {};
  };

  setSettings: SetSettingsFunc = (newSettings: { [key: string]: any }) => {};

  getFilterOptions: GetFilterOptionsFunc = () => [];
}
