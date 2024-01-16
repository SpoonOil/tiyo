import {
  LanguageKey,
  Series,
  SeriesStatus,
  GetSeriesFunc,
  GetChaptersFunc,
  GetPageRequesterDataFunc,
  GetPageUrlsFunc,
  GetSearchFunc,
  GetImageFunc,
  PageRequesterData,
  GetDirectoryFunc,
  ExtensionClientAbstract,
  GetSettingsFunc,
  SetSettingsFunc,
  GetSettingTypesFunc,
  SeriesListResponse,
  WebviewResponse,
  GetFilterOptionsFunc,
  FilterSort,
  SortDirection,
  FilterValues,
  FilterSortValue,
} from '@tiyo/common';
import { JSDOM } from 'jsdom';
import { METADATA } from './metadata';

export * from './metadata';

const BASE_URL = 'https://nhentai.net';

const ORIGINAL_LANGUAGE_MAP: { [key: string]: LanguageKey } = {
  english: LanguageKey.ENGLISH,
  japanese: LanguageKey.JAPANESE,
  chinese: LanguageKey.CHINESE_SIMP,
};

const parseDirectoryResponse = (doc: Document): SeriesListResponse => {
  const items = doc.querySelectorAll(
    'div.container.index-container:not(.index-popular) > .gallery'
  );
  const hasMore = doc.getElementsByClassName('next')!.length > 0;

  const seriesList = Array.from(items).map((item) => {
    const link = item.getElementsByTagName('a')![0];
    const img = link.getElementsByTagName('img')![1];
    const sourceId = link.getAttribute('href')!.split('/')[2];

    const series: Series = {
      id: undefined,
      extensionId: METADATA.id,
      sourceId: sourceId,

      title: item.textContent.trim(),
      altTitles: [],
      description: '',
      authors: [],
      artists: [],
      tags: [],
      status: SeriesStatus.ONGOING,
      originalLanguageKey: LanguageKey.MULTI,
      numberUnread: 0,
      remoteCoverUrl: img.getAttribute('src')!,
    };
    return series;
  });

  return {
    seriesList,
    hasMore,
  };
};

const parseTags = (row: Element) => {
  return Array.from(row.getElementsByTagName('a')).map(
    (link) => link.getElementsByClassName('name')![0].textContent
  );
};

export class ExtensionClient extends ExtensionClientAbstract {
  override getSeries: GetSeriesFunc = (id: string) => {
    return this.webviewFn(`${BASE_URL}/g/${id}`).then((response: WebviewResponse) => {
      const doc = new JSDOM(response.text).window.document;

      const titleElements = doc.getElementsByClassName('title')!;
      const title = titleElements[0].getElementsByClassName('pretty')![0].textContent.trim();
      const altTitles =
        titleElements.length > 1
          ? [titleElements[1].getElementsByClassName('pretty')![0].textContent.trim()]
          : [];

      const img = doc.getElementById('cover')!.getElementsByTagName('img')![1];

      const rows = doc.getElementsByClassName('tag-container')!;
      const parodies = parseTags(rows[0]);
      const characters = parseTags(rows[1]);
      const tags = parseTags(rows[2]);
      const artists = parseTags(rows[3]);
      // const groups = parseTags(rows[4]);
      const languages = parseTags(rows[5]);
      // const categories = parseTags(rows[6]);
      // const pages = parseTags(rows[7]);

      const description = `Parodies: ${parodies}; Characters: ${characters}`;
      let languageKey = LanguageKey.MULTI;
      if (languages) {
        languages.forEach((language) => {
          if (language in ORIGINAL_LANGUAGE_MAP) {
            languageKey = ORIGINAL_LANGUAGE_MAP[language];
          }
        });
      }

      const series: Series = {
        extensionId: METADATA.id,
        sourceId: id,

        title: title,
        altTitles: altTitles,
        description: description,
        authors: artists || [],
        artists: artists || [],
        tags: tags || [],
        status: SeriesStatus.COMPLETED,
        originalLanguageKey: languageKey,
        numberUnread: 0,
        remoteCoverUrl: img.getAttribute('src')!,
      };
      return series;
    });
  };

  override getChapters: GetChaptersFunc = (id: string) => {
    return this.webviewFn(`${BASE_URL}/g/${id}`).then((response: WebviewResponse) => {
      const doc = new JSDOM(response.text).window.document;

      const timeStr = doc.getElementsByTagName('time')![0].getAttribute('datetime')!;
      const img = doc.getElementById('cover')!.getElementsByTagName('img')![1];
      const chapterId = img.getAttribute('src')!.split('galleries/')[1].split('/')[0];

      const rows = doc.getElementsByClassName('tag-container')!;
      const groups = parseTags(rows[4]);
      const languages = parseTags(rows[5]);
      const pages = parseTags(rows[7]);

      let languageKey = LanguageKey.MULTI;
      if (languages) {
        languages.forEach((language) => {
          if (language in ORIGINAL_LANGUAGE_MAP) {
            languageKey = ORIGINAL_LANGUAGE_MAP[language];
          }
        });
      }

      return [
        {
          id: undefined,
          seriesId: undefined,
          // hack: embedding the page count in the sourceId so we don't have to get it
          // again in the page requester
          sourceId: `${chapterId}:${pages ? pages[0] : ''}`,
          title: '',
          chapterNumber: '1',
          volumeNumber: '',
          languageKey: languageKey,
          groupName: groups && groups.length > 0 ? groups[0] : '',
          time: new Date(timeStr).getTime(),
          read: false,
        },
      ];
    });
  };

  override getPageRequesterData: GetPageRequesterDataFunc = (
    seriesSourceId: string,
    chapterSourceId: string
  ) => {
    return new Promise((resolve, _reject) => {
      const galleryId = chapterSourceId.split(':')[0];
      const numPages = parseInt(chapterSourceId.split(':')[1]);

      resolve({
        server: '',
        hash: galleryId,
        numPages: numPages,
        pageFilenames: [],
      });
    });
  };

  override getPageUrls: GetPageUrlsFunc = (pageRequesterData: PageRequesterData) => {
    const pageUrls: string[] = [];
    const hosts = ['i2', 'i3', 'i5', 'i7'];

    for (let i = 1; i <= pageRequesterData.numPages; i++) {
      const host = hosts[i % hosts.length];
      pageUrls.push(`https://${host}.nhentai.net/galleries/${pageRequesterData.hash}/${i}.jpg`);
    }
    return pageUrls;
  };

  override getImage: GetImageFunc = (series: Series, url: string) => {
    return new Promise((resolve, _reject) => {
      resolve(url);
    });
  };

  override getDirectory: GetDirectoryFunc = (page: number, filterValues: FilterValues) => {
    return this.getSearch('-tag:thisdoesntexist', page, filterValues);
  };

  override getSearch: GetSearchFunc = (text: string, page: number, filterValues: FilterValues) => {
    const params = new URLSearchParams({
      page: `${page}`,
      q: text,
    });
    if ('sort' in filterValues)
      params.append('sort', (filterValues['sort'] as FilterSortValue).key);

    return this.webviewFn(`${BASE_URL}/search/?${params}`).then((response: WebviewResponse) => {
      const doc = new JSDOM(response.text).window.document;
      return parseDirectoryResponse(doc);
    });
  };

  override getSettingTypes: GetSettingTypesFunc = () => {
    return {};
  };

  override getSettings: GetSettingsFunc = () => {
    return {};
  };

  override setSettings: SetSettingsFunc = (newSettings: { [key: string]: any }) => {};

  override getFilterOptions: GetFilterOptionsFunc = () => {
    return [
      new FilterSort('sort', 'Sort', {
        key: 'recent',
        direction: SortDirection.DESCENDING,
      })
        .withFields([
          { key: 'recent', label: 'Recent' },
          { key: 'popular-today', label: 'Popular (Today)' },
          { key: 'popular-week', label: 'Popular (Week)' },
          { key: 'popular-month', label: 'Popular (Month)' },
          { key: 'popular', label: 'Popular (All Time)' },
        ])
        .withSupportsBothDirections(false),
    ];
  };
}
