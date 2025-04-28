import "./App.css";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import axios from "axios";
import "dayjs/locale/sv";
import { BiSolidRightArrow } from "react-icons/bi";

dayjs.extend(utc);
dayjs.extend(timezone);

function useFetch(url) {
  const [data, setdata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const json = await response.json();
        setdata(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
}

function perseWikiContents(wikiContent, country) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(wikiContent, "text/html");

  let headingText;
  let headingSelector;

  if (country === "Sweden") {
    headingText = "I den svenska almanackan";
    headingSelector = "h3";
  } else if (country === "Japan") {
    headingText = "記念日・年中行事";
    headingSelector = "h2";
  }

  const heading = Array.from(doc.querySelectorAll(headingSelector)).find(
    (h) => h.textContent.trim() === headingText
  );

  if (heading) {
    const listItem = heading?.nextElementSibling
      ?.querySelector("li")
      ?.textContent.trim();

    if (listItem) {
      if (listItem.includes("）")) {
        return listItem.split("）")[0] + "）";
      }
      return listItem.replace("Nuvarande – ", "");
    } else {
      return "No list items found.";
    }
  }

  return "No list items found.";
}

function DayInfo({ country }) {
  const dayjsInstance =
    country === "Sweden"
      ? dayjs().tz("Europe/Stockholm")
      : dayjs().tz("Asia/Tokyo");

  const day = dayjsInstance.format("YYYY-MM-DD");
  const time = dayjsInstance.hour();
  const timeFormat = dayjsInstance.format("HH:mm:ss");
  const timeIcon = getTimeIcon(time);
  const flags = country === "Sweden" ? "🇸🇪" : "🇯🇵";

  const japanDay = dayjs().tz("Asia/Tokyo").format("YYYY-MM-DD");
  const japanDayForUrl =
    parseInt(japanDay.substring(5, 7)) +
    "月" +
    parseInt(japanDay.substring(8, 10)) +
    "日";
  const encodedDayForUrl = encodeURIComponent(`${japanDayForUrl}`);

  const swedenDay = dayjs()
    .tz("Europe/Stockholm")
    .locale("sv")
    .format("DD-MMMM");
  const swedenDayForUrl = swedenDay.replace("-", "_");
  const encodeSwedenDayForUrl = encodeURIComponent(`${swedenDayForUrl}`);

  const weatherApiKey = process.env.REACT_APP_OPENWEATHER_API_KEY;

  const {
    data: weatherInfoJP,
    loading: loadingJP,
    error: errorJP,
  } = useFetch(
    `https://api.openweathermap.org/data/2.5/weather?q=Tokyo&appid=${weatherApiKey}`
  );

  const {
    data: weatherInfoSWE,
    loading: loadingSWE,
    error: errorSWE,
  } = useFetch(
    `https://api.openweathermap.org/data/2.5/weather?q=Stockholm&appid=${weatherApiKey}`
  );

  const {
    data: whatsDayJP,
    loading: loadingDayJP,
    error: errorDayJP,
  } = useFetch(
    `https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${encodedDayForUrl}&section=2&format=json&origin=*`
  );

  const {
    data: whatsDaySWE,
    loading: loadingDaySWE,
    error: errorDaySWE,
  } = useFetch(
    `https://sv.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${encodeSwedenDayForUrl}&section=2&format=json&origin=*`
  );

  if (loadingJP || loadingSWE || loadingDayJP || loadingDaySWE)
    return <div>Loading...</div>;
  if (errorJP || errorSWE || errorDayJP || errorDaySWE)
    return <div>Error: {errorJP || errorSWE || errorDayJP || errorDaySWE}</div>;

  const weatherUrlInstance =
    country === "Sweden" ? weatherInfoSWE : weatherInfoJP;

  const whatsDayUrlInstance =
    country === "Sweden"
      ? perseWikiContents(
          whatsDaySWE?.query?.pages
            ? Object.values(whatsDaySWE.query.pages)[0]?.extract
            : "",
          "Sweden"
        )
      : perseWikiContents(
          whatsDayJP?.query?.pages
            ? Object.values(whatsDayJP.query.pages)[0]?.extract
            : "",
          "Japan"
        );

  return (
    <div className={`DayInfo ${country}`}>
      <ul className="flex w-full pt-3 pl-8 items-center">
        <li className="text-3xl mb-1">{flags}</li>
        <li className="text-center px-8 underline decoration-sky-500/30">
          {day}
        </li>
        <li className="text-center px-8 underline decoration-pink-500/30">
          {timeFormat} {timeIcon}
        </li>
        <li className="text-center px-8 underline decoration-indigo-500/30 flex items-center">
          {weatherUrlInstance.weather[0].main}
          <img
            src={`https://openweathermap.org/img/wn/${weatherUrlInstance.weather[0].icon}.png`}
            alt={weatherUrlInstance.weather[0].main}
            className="w-8 h-8 object-cover"
          />
        </li>
        <li className="text-center px-8  underline decoration-green-500/30">
          {whatsDayUrlInstance}
        </li>
      </ul>
    </div>
  );
}

const getTimeIcon = (hour) => {
  if (hour >= 19) return "🌃";
  if (hour >= 16) return "🌇";
  if (hour >= 6) return "🏙️";
  if (hour >= 4) return "🌅";
  return "🌃";
};

function NewsInfo({ newsSource }) {
  const newsApiKey = process.env.REACT_APP_NEWSAPI_API_KEY;

  const {
    data: bbcNewsData,
    loading: loadingBbc,
    error: errorBbc,
  } = useFetch(
    `https://newsapi.org/v2/top-headlines?sources=bbc-news&pageSize=5&apiKey=${newsApiKey}`
  );

  const {
    data: sweNewsData,
    loading: loadingSWE,
    error: errorSWE,
  } = useFetch(
    `https://newsapi.org/v2/everything?q=stockholm&language=sv&pagesize=5&apiKey=${newsApiKey}`
  );

  const {
    data: omocoroData,
    loading: loadingOmocoro,
    error: errorOmocoro,
  } = useFetch(
    `https://newsapi.org/v2/everything?domains=omocoro.jp&pagesize=5&apiKey=${newsApiKey}`
  );

  const {
    data: dpzData,
    loading: loadingDpz,
    error: errorDpz,
  } = useFetch(
    `https://newsapi.org/v2/everything?domains=dailyportalz.jp&pagesize=5&apiKey=${newsApiKey}`
  );

  if (loadingBbc || loadingSWE || loadingOmocoro || loadingDpz)
    return <div>Loading...</div>;
  if (errorBbc || errorSWE || errorOmocoro || errorDpz)
    return <div>Error: {errorBbc}</div>;

  function getNewsData() {
    const dataSources = {
      bbc: bbcNewsData,
      sweNews: sweNewsData,
      omocoro: omocoroData,
      dpz: dpzData,
    };
    return dataSources[newsSource] || "no data";
  }

  const newsData = getNewsData(newsSource);

  if (newsData === "no data") {
    return <div>No news data available</div>;
  }

  function title() {
    const titleSources = {
      bbc: "BBC",
      sweNews: "Stockholm",
      omocoro: "Omocoro",
      dpz: "Daily Portal Z",
    };
    return titleSources[newsSource] || "no data";
  }

  return (
    <div className={`NewsInfo ${newsSource}`}>
      <div className="pb-10 h-97 ">
        <h2 className="text-2xl font-bold p-5px pb-5 underline decoration-pink-500 decoration-3">
          {title(newsSource)} Top News
        </h2>
        <ul>
          {getNewsData(newsSource).articles.map((article, index) => (
            <li key={index} className="mb-2 ">
              {index === 0 && article.urlToImage ? (
                <div className="mb-5">
                  <div className="flex items-start gap-4">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={article.urlToImage}
                        alt={article.title}
                        className="aspect-video w-60 object-cover"
                      />
                    </a>

                    <div className="w-2/3">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <h3 className="text-lg font-bold ">{article.title}</h3>
                      </a>
                    </div>
                  </div>
                  <div className="h-16">
                    <p className="text-smtruncate text-gray-600 mt-1">
                      {article.description}
                    </p>
                  </div>
                </div>
              ) : (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center font-bold truncate max-w-full"
                >
                  <BiSolidRightArrow className="mr-1 flex-shrink-0" />
                  <span className="truncate max-w-full">{article.title}</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Instagram() {
  const instaBusinessId = process.env.REACT_APP_INSTAGRAM_BUSINESS_ID;
  const accessToken = process.env.REACT_APP_INSTAGRAM_ACCESS_TOKEN;
  const hushtagID = "17843738311000231";

  const { data: instargramData, loading: loadingInstagram } = useFetch(
    `https://graph.facebook.com/v22.0/${hushtagID}/top_media?user_id=${instaBusinessId}&limit=8&fields=timestamp,media_url,media_type,id,children{media_type,media_url,permalink},permalink,caption&access_token=${accessToken}`
  );

  if (loadingInstagram) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold p-5px pb-5 underline decoration-pink-500 decoration-3">
        #Roomdeco
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {instargramData.data.map((item) => {
          const mediaUrl =
            item.media_type === "CAROUSEL_ALBUM"
              ? item.children?.data[0]?.media_url
              : item.media_url;

          const limitCaption =
            item.caption && item.caption.length > 30
              ? item.caption.slice(0, 30) + "[...]"
              : item.caption || "";

          return (
            <a
              key={item.id}
              href={item.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group"
            >
              <img
                src={mediaUrl}
                alt={item.caption}
                className="h-64 w-full object-cover group-hover:opacity-60 transition-opacity"
              />
              <p className="absolute bottom-0 left-0 w-full bg-black bg-opacity-60 text-white text-sm p-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                {limitCaption}
              </p>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="pt-5 bg-gray-100">
      <header className="head">
        <DayInfo country="Sweden" />
        <div className=" box-decoration-slice bg-gradient-to-r from-indigo-600 to-pink-500 flex items-center justify-center h-20">
          <h1 className=" text-white px-2 text-4xl font-bold text-center font-sans">
            MAHOOO!
          </h1>
        </div>
        <DayInfo country="Japan" />
      </header>

      <div className="px-5">
        <div className="flex">
          <div className="w-2/5 flex flex-col gap-4 mt-5 border-r border-gray-500 border-dashed">
            <div className="border-b border-gray-500 border-dashed m-5">
              <NewsInfo newsSource="bbc" />
            </div>
            <div className="m-5">
              <NewsInfo newsSource="sweNews" />
            </div>
          </div>

          <div className="w-2/5 flex flex-col gap-4 mt-5  border-r border-gray-500 border-dashed">
            <div className="border-b border-gray-500 border-dashed  m-5">
              <NewsInfo newsSource="omocoro" />
            </div>
            <div className="m-5">
              <NewsInfo newsSource="dpz" />
            </div>
          </div>
          <div className=" flex flex-col gap-4  m-5">
            <div className="m-5">
              <Instagram />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
