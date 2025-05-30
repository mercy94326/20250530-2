// EdTech 手勢互動遊戲完整版 + 多遊戲模式（修正版）
let video;
let handpose;
let predictions = [];
let bubbles = [];
let score = 0;
let timer = 60;
let gameStarted = false;
let lastBubbleTime = 0;
let currentGame = "quiz";
let blocks = [];
let holdingBlock = null;
let blockCooldown = 0;
let fruits = [];
let fruitImages = {};
let slicedFruits = [];
let bombs = [];
let bombImg;
let drawPaths = [];
let currentPath = [];

let questionSet = [
  { text: "教育科技強調科技與學習的整合", correct: true },
  { text: "建構主義提倡學生主動建構知識", correct: true },
  { text: "教育科技主要應用在學校硬體設備維修", correct: false },
  { text: "多元智能理論與教育科技無關", correct: false },
  { text: "教學媒體包含影片、AR、互動式模擬等", correct: true },
  { text: "教學設計不需要考慮學生學習歷程", correct: false },
  { text: "教育科技與課程設計可結合進行教學創新", correct: true }
];

function preload() {
  fruitImages['watermelon'] = loadImage('https://i.imgur.com/fO2fZ5W.png');
  fruitImages['watermelon_half'] = loadImage('https://i.imgur.com/ovztbmz.png');
  bombImg = loadImage('https://i.imgur.com/nUXK1sO.png');
}

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handpose = ml5.handpose(video, () => console.log("模型已載入"));
  handpose.on("predict", results => predictions = results);

  textAlign(CENTER, CENTER);
  setInterval(() => {
    if (gameStarted && timer > 0 && currentGame === "quiz") timer--;
  }, 1000);

  let switchBtn = createButton("切換遊戲模式");
  switchBtn.position(10, 10);
  switchBtn.mousePressed(() => {
    if (currentGame === "quiz") currentGame = "blocks";
    else if (currentGame === "blocks") currentGame = "fruit";
    else currentGame = "quiz";
    resetGame();
  });

  let restartBtn = createButton("重新開始");
  restartBtn.position(140, 10);
  restartBtn.mousePressed(() => {
    resetGame();
  });
}

function resetGame() {
  if (currentGame === "quiz") {
    score = 0;
    timer = 60;
    bubbles = [];
    gameStarted = true;
    loop();
  } else if (currentGame === "blocks") {
    blocks = [];
    holdingBlock = null;
    blockCooldown = 0;
    drawPaths = [];
    currentPath = [];
    loop();
  } else if (currentGame === "fruit") {
    fruits = [];
    slicedFruits = [];
    bombs = [];
    score = 0;
    loop();
  }
}

function draw() {
  background(255);
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  if (currentGame === "blocks") drawBlocks();
  else if (currentGame === "fruit") drawFruit();
  else drawQuiz();

  drawHandLandmarks();
}

function drawHandLandmarks() {
  if (predictions.length > 0) {
    let hand = predictions[0];
    let index = hand.annotations.indexFinger[3];
    let thumb = hand.annotations.thumb[3];

    let ix = width - index[0];
    let iy = index[1];
    let tx = width - thumb[0];
    let ty = thumb[1];

    let distance = dist(ix, iy, tx, ty);

    if (currentGame === "blocks") {
      if (distance < 30 && blockCooldown <= 0) {
        let newBlock = {
          x: ix - 25,
          y: iy - 25,
          w: 50,
          h: 50
        };
        blocks.push(newBlock);
        blockCooldown = 30;
      }
    }

    if (currentGame === "blocks") {
      currentPath.push({ x: ix, y: iy });
    }

    if (blockCooldown > 0) blockCooldown--;
  }

  if (currentGame === "blocks") {
    noFill();
    stroke(0);
    strokeWeight(2);
    for (let path of drawPaths) {
      beginShape();
      for (let pt of path) vertex(pt.x, pt.y);
      endShape();
    }
    beginShape();
    for (let pt of currentPath) vertex(pt.x, pt.y);
    endShape();
  }
}

function drawBlocks() {
  for (let b of blocks) {
    fill(150, 200, 255);
    rect(b.x, b.y, b.w, b.h);
  }

  fill(0);
  textSize(16);
  text("點指手勢放置積木，拖曳畫畫！", width / 2, height - 20);
}

function drawFruit() {
  for (let i = fruits.length - 1; i >= 0; i--) {
    let f = fruits[i];
    f.y -= f.vy;
    f.vy -= 0.5;

    image(fruitImages[f.sliced ? 'watermelon_half' : 'watermelon'], f.x, f.y, 60, 60);

    if (f.y < -60) fruits.splice(i, 1);
  }

  for (let b of bombs) {
    b.y -= b.vy;
    b.vy -= 0.5;
    image(bombImg, b.x, b.y, 60, 60);
  }

  if (frameCount % 90 === 0) {
    let isBomb = random() < 0.2;
    if (isBomb) {
      bombs.push({ x: random(width), y: height, vy: random(8, 12) });
    } else {
      fruits.push({ x: random(width), y: height, vy: random(10, 15), sliced: false });
    }
  }

  if (predictions.length > 0) {
    let pts = predictions[0].annotations.indexFinger;
    let x = width - pts[3][0];
    let y = pts[3][1];

    for (let i = fruits.length - 1; i >= 0; i--) {
      let f = fruits[i];
      if (!f.sliced && dist(x, y, f.x + 30, f.y + 30) < 30) {
        f.sliced = true;
        score++;
      }
    }

    for (let b of bombs) {
      if (dist(x, y, b.x + 30, b.y + 30) < 30) {
        score = 0;
      }
    }
  }

  fill(0);
  textSize(20);
  text("得分: " + score, width / 2, 30);
}

function drawQuiz() {
  if (!gameStarted) return;
  if (bubbles.length < 1 && millis() - lastBubbleTime > 1000) {
    let q = random(questionSet);
    let isCorrect = q.correct;
    let x = random(50, width - 50);
    bubbles.push({ text: q.text, x, y: height, correct: isCorrect });
    lastBubbleTime = millis();
  }

  for (let i = bubbles.length - 1; i >= 0; i--) {
    let b = bubbles[i];
    b.y -= 2;
    fill(255);
    stroke(0);
    ellipse(b.x, b.y, 200, 80);
    fill(0);
    noStroke();
    textSize(14);
    text(b.text, b.x, b.y);

    if (predictions.length > 0) {
      let finger = predictions[0].annotations.indexFinger[3];
      let fx = width - finger[0];
      let fy = finger[1];
      if (dist(fx, fy, b.x, b.y) < 40) {
        if (b.correct) score++;
        else score--;
        bubbles.splice(i, 1);
      }
    }
  }

  fill(0);
  textSize(18);
  text("時間: " + timer + " | 分數: " + score, width / 2, 30);

  if (timer <= 0) {
    gameStarted = false;
    textSize(24);
    text("時間到！最終得分: " + score, width / 2, height / 2);
    noLoop();
  }
}
