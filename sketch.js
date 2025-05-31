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
    loop();
  } else if (currentGame === "fruit") {
    fruits = [];
    slicedFruits = [];
    bombs = [];
    loop();
  }
}

function draw() {
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  fill(255);
  textSize(20);
  stroke(0);
  strokeWeight(3);
  text(currentGame === "quiz" ? `分數：${score}  時間：${timer}` : (currentGame === "blocks" ? `堆積木模式，高度：${blocks.length}` : `切西瓜遊戲 分數：${score}`), width / 2, 20);
  noStroke();

  if (currentGame === "quiz") {
    if (!gameStarted) {
      textSize(28);
      fill(255);
      stroke(0);
      strokeWeight(4);
      text("按任意鍵開始遊戲", width / 2, height / 2);
      noStroke();
      return;
    }
    if (timer <= 0) {
      textSize(32);
      fill(255);
      stroke(0);
      strokeWeight(4);
      text("遊戲結束！最終分數：" + score, width / 2, height / 2);
      noStroke();
      noLoop();
      return;
    }
    if (millis() - lastBubbleTime > 2000) {
      let q = random(questionSet);
      bubbles.push(new Bubble(q.text, q.correct));
      lastBubbleTime = millis();
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      bubbles[i].update();
      bubbles[i].display();
      if (bubbles[i].offScreen()) bubbles.splice(i, 1);
    }
  } else if (currentGame === "blocks") {
    for (let block of blocks) block.display();
    if (holdingBlock) holdingBlock.display();
    if (blockCooldown > 0) blockCooldown--;
  } else if (currentGame === "fruit") {
    if (frameCount % 60 === 0) {
      fruits.push(new Fruit());
      if (random(1) < 0.2) bombs.push(new Bomb());
    }
    for (let i = fruits.length - 1; i >= 0; i--) {
      fruits[i].update();
      fruits[i].display();
      if (fruits[i].offScreen()) fruits.splice(i, 1);
    }
    for (let i = slicedFruits.length - 1; i >= 0; i--) {
      slicedFruits[i].update();
      slicedFruits[i].display();
      if (slicedFruits[i].offScreen()) slicedFruits.splice(i, 1);
    }
    for (let i = bombs.length - 1; i >= 0; i--) {
      bombs[i].update();
      bombs[i].display();
      if (bombs[i].offScreen()) bombs.splice(i, 1);
    }
  }

  drawHandAndDetect();
}

function keyPressed() {
  if (!gameStarted && currentGame === "quiz") {
    gameStarted = true;
    timer = 60;
    score = 0;
    bubbles = [];
    loop();
  }
}

function drawHandAndDetect() {
  if (predictions.length > 0) {
    const hand = predictions[0].landmarks;
    const thumbTip = hand[4];
    const indexTip = hand[8];
    const middleTip = hand[12];
    const wrist = hand[0];

    noFill();
    stroke(0, 255, 0);
    strokeWeight(2);
    for (let pt of hand) ellipse(width - pt[0], pt[1], 8, 8);

    let handX = width - indexTip[0];
    let handY = indexTip[1];

    if (currentGame === "quiz") {
      for (let i = bubbles.length - 1; i >= 0; i--) {
        let b = bubbles[i];
        if (dist(width - indexTip[0], indexTip[1], b.x, b.y) < b.r) {
          if (thumbTip[1] < wrist[1] - 30) {
            if (b.correct) score++;
            else score--;
            bubbles.splice(i, 1);
          } else if (dist(indexTip[0], indexTip[1], middleTip[0], middleTip[1]) > 40) {
            if (!b.correct) score++;
            else score--;
            bubbles.splice(i, 1);
          }
        }
      }
    } else if (currentGame === "blocks") {
      if (!holdingBlock) {
        holdingBlock = new Block(handX, handY);
      } else {
        holdingBlock.x = handX;
        holdingBlock.y = handY;
        let distance = dist(indexTip[0], indexTip[1], thumbTip[0], thumbTip[1]);
        if (distance < 40 && blockCooldown <= 0) {
          holdingBlock.snapToStack();
          blocks.push(holdingBlock);
          holdingBlock = null;
          blockCooldown = 20;
        }
      }
    } else if (currentGame === "fruit") {
      for (let i = fruits.length - 1; i >= 0; i--) {
        if (fruits[i].isTouched(handX, handY)) {
          score++;
          slicedFruits.push(new SlicedFruit(fruits[i].x, fruits[i].y));
          fruits.splice(i, 1);
        }
      }
      for (let i = bombs.length - 1; i >= 0; i--) {
        if (bombs[i].isTouched(handX, handY)) {
          score = max(0, score - 5);
          bombs.splice(i, 1);
        }
      }
    }
  }
}

class Bubble {
  constructor(txt, correct) {
    this.text = txt;
    this.correct = correct;
    this.x = random(100, width - 100);
    this.y = -50;
    this.r = 60;
    this.speed = 2;
  }

  update() {
    this.y += this.speed;
  }

  offScreen() {
    return this.y > height + this.r;
  }

  display() {
    fill(this.correct ? 'lightblue' : 'lightpink');
    stroke(0);
    ellipse(this.x, this.y, this.r * 2);
    fill(0);
    textSize(14);
    stroke(255);
    strokeWeight(4);
    text(this.text, this.x, this.y, this.r * 1.8);
    noStroke();
  }
}

class Block {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 50;
    this.h = 30;
  }

  snapToStack() {
    this.y = height - 30 - blocks.length * 30;
    this.x = constrain(this.x, this.w / 2, width - this.w / 2);
  }

  display() {
    fill("gold");
    stroke(0);
    rectMode(CENTER);
    rect(this.x, this.y, this.w, this.h);
  }
}

class Fruit {
  constructor() {
    this.x = random(100, width - 100);
    this.y = height;
    this.vx = random(-2, 2);
    this.vy = -random(10, 18);
    this.gravity = 0.4;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
  }

  offScreen() {
    return this.y > height + 50;
  }

  display() {
    image(fruitImages['watermelon'], this.x - 30, this.y - 30, 60, 60);
  }

  isTouched(x, y) {
    return dist(x, y, this.x, this.y) < 40;
  }
}

class SlicedFruit {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx1 = -2;
    this.vx2 = 2;
    this.vy = -2;
    this.gravity = 0.2;
  }

  update() {
    this.x1 = this.x + this.vx1;
    this.x2 = this.x + this.vx2;
    this.y += this.vy;
    this.vy += this.gravity;
  }

  offScreen() {
    return this.y > height + 50;
  }

  display() {
    image(fruitImages['watermelon_half'], this.x1 - 30, this.y - 30, 30, 60);
    image(fruitImages['watermelon_half'], this.x2, this.y - 30, 30, 60);
  }
}

class Bomb {
  constructor() {
    this.x = random(100, width - 100);
    this.y = height;
    this.vx = random(-2, 2);
    this.vy = -random(10, 18);
    this.gravity = 0.4;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
  }

  offScreen() {
    return this.y > height + 50;
  }

  display() {
    image(bombImg, this.x - 20, this.y - 20, 40, 40);
  }

  isTouched(x, y) {
    return dist(x, y, this.x, this.y) < 40;
  }
}
