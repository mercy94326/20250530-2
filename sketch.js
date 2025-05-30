// EdTech 手勢互動遊戲完整版 + 堆積木與切西瓜小遊戲
let video;
let handpose;
let predictions = [];
let bubbles = [];
let fruits = [];
let explosions = [];
let score = 0;
let timer = 60;
let gameStarted = false;
let lastBubbleTime = 0;
let lastFruitTime = 0;
let currentGame = "quiz";
let blocks = [];
let holdingBlock = null;
let blockHeight = 0;

let questionSet = [
  { text: "教育科技強調科技與學習的整合", correct: true },
  { text: "建構主義提倡學生主動建構知識", correct: true },
  { text: "教育科技主要應用在學校硬體設備維修", correct: false },
  { text: "多元智能理論與教育科技無關", correct: false },
  { text: "教學媒體包含影片、AR、互動式模擬等", correct: true },
  { text: "教學設計不需要考慮學生學習歷程", correct: false },
  { text: "教育科技與課程設計可結合進行教學創新", correct: true }
];

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
    currentGame = currentGame === "quiz" ? "blocks" : currentGame === "blocks" ? "fruit" : "quiz";
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
    blockHeight = 0;
    loop();
  } else if (currentGame === "fruit") {
    fruits = [];
    explosions = [];
    score = 0;
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
  if (currentGame === "quiz") {
    text(`分數：${score}  時間：${timer}`, width / 2, 20);
  } else if (currentGame === "blocks") {
    text(`堆積木模式｜目前高度：${blockHeight}`, width / 2, 20);
  } else {
    text(`切西瓜模式｜得分：${score}`, width / 2, 20);
  }
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
  } else if (currentGame === "fruit") {
    if (millis() - lastFruitTime > 1000) {
      fruits.push(new Fruit());
      lastFruitTime = millis();
    }
    for (let i = fruits.length - 1; i >= 0; i--) {
      fruits[i].update();
      fruits[i].display();
      if (fruits[i].offScreen()) fruits.splice(i, 1);
    }
    for (let e of explosions) e.display();
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
      let handX = width - indexTip[0];
      let handY = indexTip[1];

      if (!holdingBlock) {
        holdingBlock = new Block(handX, handY);
      } else {
        holdingBlock.x = handX;
        holdingBlock.y = handY;

        if (dist(thumbTip[0], thumbTip[1], indexTip[0], indexTip[1]) < 30) {
          holdingBlock.y = height - 30 - blockHeight * 30;
          blocks.push(holdingBlock);
          holdingBlock = null;
          blockHeight++;
        }
      }
    } else if (currentGame === "fruit") {
      let hx = width - indexTip[0];
      let hy = indexTip[1];

      for (let i = fruits.length - 1; i >= 0; i--) {
        if (fruits[i].checkCut(hx, hy)) {
          explosions.push(new Explosion(fruits[i].x, fruits[i].y));
          if (!fruits[i].isBomb) score++;
          else score = max(score - 3, 0);
          fruits.splice(i, 1);
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
    textSize(16);
    stroke(255);
    strokeWeight(4);
    text(this.text, this.x, this.y);
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
    this.y = height + 50;
    this.r = 40;
    this.speedY = -8 - random(3);
    this.gravity = 0.4;
    this.isBomb = random(1) < 0.2;
    this.cut = false;
  }

  update() {
    this.y += this.speedY;
    this.speedY += this.gravity;
  }

  offScreen() {
    return this.y > height + this.r;
  }

  checkCut(hx, hy) {
    if (!this.cut && dist(this.x, this.y, hx, hy) < this.r) {
      this.cut = true;
      return true;
    }
    return false;
  }

  display() {
    if (!this.cut) {
      fill(this.isBomb ? 'black' : 'green');
      ellipse(this.x, this.y, this.r * 2);
    } else {
      fill('red');
      arc(this.x - 20, this.y, this.r, this.r, PI + QUARTER_PI, TWO_PI);
      arc(this.x + 20, this.y, this.r, this.r, PI, PI + HALF_PI);
    }
  }
}

class Explosion {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.life = 20;
  }
  display() {
    if (this.life > 0) {
      fill(255, 100, 100, this.life * 10);
      ellipse(this.x, this.y, this.life * 2);
      this.life--;
    }
  }
}
ㄋ
