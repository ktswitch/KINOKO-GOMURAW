const PER_PAGE = 20;

class MainController extends Controller {
    load(data) {
        this.id = data.id;
        this.url = data.url;
        this.page = 0;

        let cached = this.readCache();
        let list = cached && cached.items ? cached.items : [];

        this.data = {
            list: list,
            loading: false,
            hasMore: true
        };

        if (cached) {
            let now = new Date().getTime();
            if (now - cached.time > 30 * 60 * 1000) {
                this.reload();
            }
        } else {
            this.reload();
        }
    }

    makeURL(page) {
        return this.url.replace('{0}', page + 1);
    }

    async fetchPage(url) {
        let res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Referer': 'https://gomuraw.quest/'
            }
        });
        return await res.text();
    }

    async onPressed(index) {
        await this.navigateTo('book', {
            data: this.data.list[index]
        });
    }

    onRefresh() {
        this.reload();
    }

    async reload() {
        this.setState(() => {
            this.data.loading = true;
        });

        try {
            let url = this.makeURL(0);
            let text = await this.fetchPage(url);
            let items = this.parseData(text, url);

            if (items.length === 0) {
                throw new Error('No manga items found on the page');
            }

            this.page = 0;
            localStorage['cache_gomuraw_' + this.id] = JSON.stringify({
                time: new Date().getTime(),
                items: items
            });

            this.setState(() => {
                this.data.list = items;
                this.data.loading = false;
                this.data.hasMore = items.length >= PER_PAGE;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(() => {
                this.data.loading = false;
            });
        }
    }

    async onLoadMore() {
        this.setState(() => {
            this.data.loading = true;
        });

        try {
            let page = this.page + 1;
            let url = this.makeURL(page);
            let text = await this.fetchPage(url);
            let items = this.parseData(text, url);

            this.page = page;
            this.setState(() => {
                let known = new Set(this.data.list.map(item => item.link));
                for (let item of items) {
                    if (!known.has(item.link)) {
                        this.data.list.push(item);
                        known.add(item.link);
                    }
                }
                this.data.loading = false;
                this.data.hasMore = items.length >= PER_PAGE;
            });
        } catch (e) {
            showToast(`${e}\n${e.stack}`);
            this.setState(() => {
                this.data.loading = false;
            });
        }
    }

    readCache() {
        let cache = localStorage['cache_gomuraw_' + this.id];
        return cache ? JSON.parse(cache) : null;
    }

    parseData(text, url) {
        const doc = HTMLParser.parse(text);
        let elems = doc.querySelectorAll('section .comic.md > .item');
        if (elems.length === 0) {
            elems = doc.querySelectorAll('.comic.md > .item');
        }

        let results = [];
        let known = new Set();

        for (let elem of elems) {
            let poster = elem.querySelector('a.poster') || elem.querySelector('a.title');
            if (!poster) continue;

            let link = poster.getAttribute('href');
            if (!link) continue;

            link = new URL(link, url).toString();
            if (known.has(link)) continue;

            let titleNode = elem.querySelector('a.title');
            let img = elem.querySelector('img');
            if (!titleNode || !img) continue;

            let picture = img.getAttribute('data-original')
                || img.getAttribute('data-src')
                || img.getAttribute('src');

            if (!picture) continue;
            if (picture.indexOf('/public/assets/images/') === 0) continue;

            let subtitle = '';
            let metadata = elem.querySelector('.metadata');
            if (metadata) {
                subtitle = metadata.text.trim().replace(/\s+/g, ' ');
            }

            known.add(link);
            results.push({
                title: titleNode.text.trim(),
                link: link,
                picture: new URL(picture, url).toString(),
                subtitle: subtitle
            });
        }

        return results;
    }
}

module.exports = MainController;
