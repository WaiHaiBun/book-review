import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "movie_review_proj",
  password: "CRUD1234",
  port: 5432,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// app.get("/health", async (req, res) => {
//   console.log("healthy");
//   res.sendStatus(200);
// });

// const moviePath = "http://www.omdbapi.com/?apikey=2d98dd4e&t=";

app.post("/review", async (req, res) => {
  const { name, rating, description } = req.body;

  const movieInfo = await axios.get(
    "http://www.omdbapi.com/?apikey=2d98dd4e&t=" + name
  );

  const { imdbID, Title, Poster } = movieInfo.data;

  // if imdbID does not exist then return Movie does not exist, else continue

  if (!imdbID) {
    res.sendStatus(404);
    return;
  }

  try {
    const createdReview = await db.query(
      "INSERT INTO review (imdb_id, image_link, name, rating) VALUES ($1, $2, $3, $4) RETURNING *",
      [imdbID, Poster, Title, rating]
    );

    const reviewId = createdReview.rows[0].id;
    await commentInsert(description, reviewId);

    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.post("/comment", async (req, res) => {
  const { description, reviewId } = req.body;
  // console.log(req.body);
  try {
    await commentInsert(description, reviewId);
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

const commentInsert = async (description, reviewId) => {
  try {
    await db.query(
      "INSERT INTO comment (description, review_id) VALUES ($1, $2)",
      [description, reviewId]
    );
  } catch (err) {
    throw err;
  }
};

const commentGatherer = async (reviewId) => {
  try {
    const result = await db.query(
      "SELECT * FROM comment WHERE review_id = $1",
      [reviewId]
    );
    return result.rows;
  } catch (err) {
    throw err;
  }
};

app.post("/ratingEdit", async (req, res) => {
  const { rating, id } = req.body;

  try {
    await db.query("UPDATE review SET rating = ($1) WHERE id = $2", [
      rating,
      id,
    ]);
    // res.redirect("/");
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
  }
});

app.post("/descriptionEdit", async (req, res) => {
  const { description, id } = req.body;

  try {
    await db.query("UPDATE comment SET description = ($1) WHERE id = $2", [
      description,
      id,
    ]);
    // res.redirect("/");
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
  }
});

app.get("/review/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query("SELECT * FROM review WHERE id = $1", [id]);
    const reviewResult = result.rows[0];
    const comments = await commentGatherer(id);

    const fetchedReview = {
      ...reviewResult,
      comments,
    };
    console.log(fetchedReview);

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
  }
});

app.get("/preview", async (req, res) => {
  const { frontpage } = req.query;

  try {
    const result = await db.query("SELECT name, image_link FROM review");
    // console.log(result.rows);
    const reviewList = result.rows;
    // const listSize = reviewList.length;
    if (!frontpage) {
      console.log(reviewList);
      res.sendStatus(201);
      return;
    }
    const shuffleList = reviewList.sort(() => Math.random() - 0.5);
    // console.log(shuffleList);
    const firstThree = shuffleList.slice(0, 3);
    console.log(firstThree);
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});

app.get("");

app.delete("/review", async (req, res) => {
  const { id } = req.body;
  try {
    await db.query("DELETE FROM comment WHERE review_id = $1", [id]);
    await db.query("DELETE FROM review WHERE id = $1", [id]);
    // res.redirect("/");
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
  }
});

app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
});

// {
//   "Title": "Minions",
//   "Year": "2015",
//   "Rated": "PG",
//   "Released": "10 Jul 2015",
//   "Runtime": "91 min",
//   "Genre": "Animation, Adventure, Comedy",
//   "Director": "Kyle Balda, Pierre Coffin",
//   "Writer": "Brian Lynch",
//   "Actors": "Sandra Bullock, Jon Hamm, Michael Keaton",
//   "Plot": "Minions Stuart, Kevin, and Bob are recruited by Scarlet Overkill, a supervillain who, alongside her inventor husband Herb, hatches a plot to take over the world.",
//   "Language": "English, Spanish, Italian",
//   "Country": "United States, France",
//   "Awards": "Nominated for 1 BAFTA Award4 wins & 29 nominations total",
//   "Poster": "https://m.media-amazon.com/images/M/MV5BODI4NzMyNjE0MF5BMl5BanBnXkFtZTgwMTcwNzI0MzE@._V1_SX300.jpg",
//   "Ratings": [
//       {
//           "Source": "Internet Movie Database",
//           "Value": "6.4/10"
//       },
//       {
//           "Source": "Rotten Tomatoes",
//           "Value": "55%"
//       },
//       {
//           "Source": "Metacritic",
//           "Value": "56/100"
//       }
//   ],
//   "Metascore": "56",
//   "imdbRating": "6.4",
//   "imdbVotes": "271,270",
//   "imdbID": "tt2293640",
//   "Type": "movie",
//   "DVD": "N/A",
//   "BoxOffice": "$336,045,770",
//   "Production": "N/A",
//   "Website": "N/A",
//   "Response": "True"
// }
