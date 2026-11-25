class IndexController extends Controller {
    load() {
        this.data = {
            tabs: [
                {
                    "title": "最新",
                    "id": "latest",
                    "url": "https://gomuraw.quest/?page={0}"
                },
                {
                    "title": "人気",
                    "id": "hot",
                    "url": "https://gomuraw.quest/hot?page={0}"
                }
            ]
        };
    }
}

module.exports = IndexController;
