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
  GetFilterOptionsFunc,
  FilterValues,
} from '@tiyo/common';
import { JSDOM } from 'jsdom';
import { METADATA } from './metadata';

export * from './metadata';

const SERIES_STATUS_MAP: { [key: string]: SeriesStatus } = {
  publishing: SeriesStatus.ONGOING,
  finished: SeriesStatus.COMPLETED,
  'on hiatus': SeriesStatus.ONGOING,
  discontinued: SeriesStatus.CANCELLED,
  'not yet published': SeriesStatus.ONGOING,
};

const parseSeriesGrid = (root: Element): Series[] => {
  return Array.from(root.getElementsByClassName('relative block')!).map((node: Element) => {
    const parent = node.parentElement!;
    const img = parent.getElementsByTagName('img')![0];
    const link = parent.getElementsByTagName('a')![1];
    const sourceId = link.getAttribute('href')!;

    const series: Series = {
      id: undefined,
      extensionId: METADATA.id,
      sourceId: sourceId,

      title: link.textContent.trim(),
      altTitles: [],
      description: '',
      authors: [],
      artists: [],
      tags: [],
      status: SeriesStatus.ONGOING,
      originalLanguageKey: LanguageKey.MULTI,
      numberUnread: 0,
      remoteCoverUrl: img.getAttribute('data-src')!,
    };
    return series;
  });
};

export class ExtensionClient extends ExtensionClientAbstract {
  override getSeries: GetSeriesFunc = (id: string) => {
    return fetch(`${METADATA.url}${id}`)
      .then((response) => response.text())
      .then((text: string) => {
        const doc = new JSDOM(text).window.document;
        const container = doc.getElementsByClassName('container')![1];

        const img = container.getElementsByTagName('img')![0];
        const parent = img.parentElement!.parentElement!;
        const detailsContainer = parent.getElementsByClassName('flex')![0];

        const title = detailsContainer.getElementsByTagName('h1')![0].textContent.trim();
        const description = detailsContainer.getElementsByTagName('p')![0].textContent.trim();

        const cells = detailsContainer
          .getElementsByClassName('grid')![0]
          .getElementsByTagName('div')!;
        const typeStr = cells[0].getElementsByTagName('div')![0].textContent.trim();
        const statusStr = cells[2].getElementsByTagName('div')![0].textContent.trim();

        let languageKey = LanguageKey.JAPANESE;
        switch (typeStr) {
          case 'manhwa':
            languageKey = LanguageKey.KOREAN;
            break;
          case 'manhua':
            languageKey = LanguageKey.CHINESE_SIMP;
            break;
        }

        const genresContainer = detailsContainer.children[detailsContainer.children.length - 2];
        const tags = [...genresContainer.getElementsByTagName('a')!].map(
          (link) => link.textContent
        );

        const series: Series = {
          extensionId: METADATA.id,
          sourceId: id,

          title: title,
          altTitles: [],
          description: description,
          authors: [],
          artists: [],
          tags: tags,
          status: SERIES_STATUS_MAP[statusStr],
          originalLanguageKey: languageKey,
          numberUnread: 0,
          remoteCoverUrl: img.getAttribute('data-src')!,
        };
        return series;
      });
  };

  override getChapters: GetChaptersFunc = (id: string) => {
    return fetch(`${METADATA.url}${id}`)
      .then((response) => response.text())
      .then((text: string) => {
        const doc = new JSDOM(text).window.document;

        const container = doc.getElementById('chapters')!;

        return [...container.getElementsByTagName('a')!].map((link) => {
          const sourceId = link.getAttribute('href')!;
          const title = link.textContent.trim();
          const chapterNum = title.split('Chapter ')[1];

          return {
            id: undefined,
            seriesId: undefined,
            sourceId: sourceId,
            title: title,
            chapterNumber: chapterNum,
            volumeNumber: '',
            languageKey: LanguageKey.ENGLISH,
            groupName: '',
            time: 0,
            read: false,
          };
        });
      });
  };

  override getPageRequesterData: GetPageRequesterDataFunc = (
    seriesSourceId: string,
    chapterSourceId: string
  ) => {
    return fetch(`${METADATA.url}${chapterSourceId}`)
      .then((response) => response.text())
      .then((text: string) => {
        const doc = new JSDOM(text).window.document;

        const imageUrls = Array.from(doc.getElementsByTagName('img')!).map(
          (img) => img.getAttribute('data-src')!
        );

        return {
          server: '',
          hash: '',
          numPages: imageUrls.length,
          pageFilenames: imageUrls,
        };
      });
  };

  override getPageUrls: GetPageUrlsFunc = (pageRequesterData: PageRequesterData) => {
    return pageRequesterData.pageFilenames;
  };

  override getImage: GetImageFunc = (series: Series, url: string) => {
    return new Promise((resolve, reject) => {
      resolve(url);
    });
  };

  override getDirectory: GetDirectoryFunc = (page: number, filterValues: FilterValues) => {
    return fetch(`${METADATA.url}/mangas/new`)
      .then((response) => response.text())
      .then((text: string) => {
        const doc = new JSDOM(text).window.document;
        const grid = doc.getElementsByClassName('grid')![0];
        return {
          seriesList: parseSeriesGrid(grid),
          hasMore: false,
        };
      });
  };

  override getSearch: GetSearchFunc = (text: string, page: number, filterValues: FilterValues) => {
    return fetch(`${METADATA.url}/search?page=${page}&q=${text}`)
      .then((response) => response.text())
      .then((text: string) => {
        const doc = new JSDOM(text).window.document;
        const grid = doc.getElementsByClassName('grid')![2];

        const innerLinks = doc.getElementsByClassName('container')![1].getElementsByTagName('a')!;
        const hasMore = innerLinks[innerLinks.length - 1].textContent === 'Next';

        return {
          seriesList: parseSeriesGrid(grid),
          hasMore,
        };
      });
  };

  override getSettingTypes: GetSettingTypesFunc = () => {
    return {};
  };

  override getSettings: GetSettingsFunc = () => {
    return {};
  };

  override setSettings: SetSettingsFunc = (newSettings: { [key: string]: any }) => {};

  override getFilterOptions: GetFilterOptionsFunc = () => [];
}
