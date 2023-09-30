import { faker } from "@faker-js/faker";
import type { RecordType, SourceName, TRecord } from "../../src/entities.js";
import { toXml } from "../../src/utils.js";

interface FakeWordPressPostV2Props {
  type: RecordType;
  sourceName: SourceName;
}

export class FakeWordPressPostV2 {
  private readonly title = faker.string.alpha();
  private readonly date = faker.date.anytime();
  private readonly link = faker.internet.url();
  private readonly id = faker.number.int();
  private readonly excerpt = faker.string.alpha();

  constructor(private readonly props: FakeWordPressPostV2Props) {}

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  toJson() {
    return {
      title: { rendered: this.title },
      date: this.date,
      link: this.link,
      id: this.id,
      excerpt: { rendered: this.excerpt },
    };
  }

  toRecord(): TRecord {
    return {
      type: this.props.type,
      sourceName: this.props.sourceName,
      id: this.id.toString(),
      title: this.title,
      link: this.link,
      publicationDate: new Date(this.date),
      description: this.excerpt,
    };
  }
}

export class FakeWordPressPostsV2 {
  private readonly posts: FakeWordPressPostV2[];
  readonly length: number;

  constructor(props: FakeWordPressPostV2Props, count?: number) {
    this.posts = faker.helpers.multiple(() => new FakeWordPressPostV2(props), {
      count: count ?? { min: 1, max: 25 },
    });
    this.length = this.posts.length;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  toJson() {
    return this.posts.map((post) => post.toJson());
  }

  toRecords(): TRecord[] {
    return this.posts.map((post) => post.toRecord());
  }
}

class FakeConcertsMetalItem {
  private readonly title = faker.string.alpha();
  private readonly pubDate = faker.date.anytime();
  private readonly link = faker.internet.url();
  private readonly guid = faker.string.uuid();
  private readonly description = faker.string.alpha();

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  toJson() {
    return {
      title: [this.title],
      pubDate: [this.pubDate.toISOString()],
      link: [this.link],
      guid: [this.guid],
      description: [this.description],
    };
  }

  toRecord(): TRecord {
    return {
      type: "concert",
      sourceName: "Concerts-Metal.com",
      id: this.guid,
      title: this.title,
      link: this.link,
      publicationDate: new Date(this.pubDate),
      description: this.description,
    };
  }
}

export class FakeConcertsMetalList {
  private readonly items: FakeConcertsMetalItem[];
  readonly length: number;

  constructor(count?: number) {
    this.items = faker.helpers.multiple(() => new FakeConcertsMetalItem(), {
      count: count ?? { min: 1, max: 25 },
    });
    this.length = this.items.length;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  toJson() {
    return {
      rss: {
        channel: [
          {
            item: this.items.map((item) => item.toJson()),
          },
        ],
      },
    };
  }

  toXml(): string {
    return toXml(this.toJson());
  }

  toRecords(): TRecord[] {
    return this.items.map((item) => item.toRecord());
  }
}
