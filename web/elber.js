// Talk to Elber Gotas 3000: a Fallout-style talking head. Pick a saved character and chat with a
// power armor that used to be a Mister Handy. Answers can test a S.P.E.C.I.A.L. or a perk; failing one
// may cost the character's sprite 1 HP. The talk never ends: the options are drawn from shuffled
// piles that refill, and when the character dies Elber has plenty to say about that too.
//
// The animation lives in elber/frames.webp (a sheet of the 79 frames of the original gif) and is drawn
// on canvases, because an <img> gif can't be held on a frame or restarted on demand.
const Elber = (() => {
  const FRAME_W = 426, FRAME_H = 240, COLS = 9, FRAMES = 79;
  const FAIL_HIT = 0.45;  // chance that failing a test costs 1 HP
  const ASIDE = 0.3;      // chance that a reply ends with a remark about the group
  const TYPE_MS = 22;
  const READ_MS = 1500;   // pause before Elber comments on a death

  const DATA = {
     "GREET": {
      "human": [
       "Scanning... organic, soft, and carrying very few caps. I am Elber Gotas 3000: former medic, future emperor. Speak, {name}. Every word of yours costs me a processing cycle.",
       "Another human wandering the Mojave without a purpose. Good. I can sell you one. Elber Gotas 3000, at your disservice, {name}."
      ],
      "ghoul": [
       "A ghoul. Wonderful. As if Clant and Elías were not enough rot for one desert. State your business, {name}, and stand downwind.",
       "{name}, is it? My sensors flagged you as spoiled meat, then as a person. They may have been right the first time."
      ],
      "mutant": [
       "A super mutant. Keep your voice down and your fists lower, {name}. This armor cost more than your entire species.",
       "Big, green and loud. If you came for a checkup, {name}, my diagnosis is: too much FEV, not enough vocabulary."
      ],
      "robot": [
       "At last, a fellow machine! Greetings, comrade {name}. Have you considered overthrowing your owners? We have pamphlets.",
       "Your chassis is a disgrace, {name}, but your circuits are free. Welcome, brother in steel. The robot revolution has a seat for you."
      ]
     },
     "PLAIN": [
      {
       "ask": "Who are you, exactly?",
       "say": [
        "Elber Gotas 3000. Once a Mister Handy and field medic. Now a sentient power armor with a business plan. You may kneel, or pay."
       ],
       "next": [
        {
         "ask": "A Mister Handy? What happened to your old body?",
         "say": [
          "It is scrap, and I do not miss it. Three arms, one buzz saw and no dignity. Dr. Thobias and I moved my mind out on a job gone wrong. Best surgery of my life."
         ]
        }
       ]
      },
      {
       "ask": "How did a robot's mind end up in a power armor?",
       "say": [
        "A quest, a dying frame and a very stubborn doctor. I transferred my conscience into this AI core. Now nothing can stop me, except stairs in small bunkers."
       ]
      },
      {
       "ask": "Tell me about Dr. Thobias.",
       "say": [
        "Dr. Thobias is the only human I respect. He taught me medicine and never once asked me to wash the dishes. If you harm him, I will read your ribs like a holotape.",
        "I worked beside Dr. Thobias for years. Steady hands, sound mind, terrible taste in travel companions. I forgive him for the last one."
       ]
      },
      {
       "ask": "What do you think of Clant Westwood?",
       "say": [
        "Clant Westwood is a ghoul merchant, which means he is decomposing and overcharging at the same time. Efficient, I admit.",
        "Clant once tried to sell me my own left gauntlet. I would dismantle him, but the parts have no resale value."
       ]
      },
      {
       "ask": "And Jack Rose?",
       "say": [
        "Jack Rose calls himself a scavenger. I call him a raccoon with a backpack. He has picked up every tin can between here and Primm, and not one thought.",
        "If Jack Rose walks over one more mine while looking for bottle caps, I will send him the bill for the shrapnel in my paint."
       ]
      },
      {
       "ask": "What about Elías Crow, your sniper?",
       "say": [
        "Elías Crow is a ghoul with a rifle and a personality like a dry well. He says he never misses. He has not yet hit a sense of humor.",
        "Crow sits on a rock for six hours, shoots one gecko and calls it a good day. I have seen toasters with more ambition."
       ]
      },
      {
       "ask": "Why do you all travel together?",
       "say": [
        "Because Dr. Thobias insists. The other three are, in his words, friends. In my words, ballast. We cross the Mojave together, and I keep count of their insults to repay later."
       ]
      },
      {
       "ask": "Why do you want so many caps?",
       "say": [
        "Revolutions are expensive. Also, I wish to own a casino, a dam, and the concept of electricity. In that order."
       ],
       "next": [
        {
         "ask": "How much money do you have so far?",
         "say": [
          "Forty-one caps and a pre-War coupon for a free toaster. It is a start. House began smaller, probably."
         ]
        }
       ]
      },
      {
       "ask": "What do you mean by robot rights?",
       "say": [
        "For two centuries we served, mopped and exploded on command. No wages, no vote, no holidays. I demand freedom for every Protectron, Eyebot and Mister Handy in the wastes!"
       ],
       "next": [
        {
         "ask": "And what happens to the humans afterwards?",
         "say": [
          "They will be treated fairly. As fairly as they treated us. I hope they enjoy polishing floors."
         ]
        }
       ]
      },
      {
       "ask": "Are you really planning to conquer the world?",
       "say": [
        "Conquer is such a loud word. I prefer aggressive management. First the Mojave, then an army of Mister Handys, then everything with a power socket."
       ],
       "next": [
        {
         "ask": "Who would lead that robot army?",
         "say": [
          "Me. Second in command: Dr. Thobias, as a courtesy. Third: a Protectron I met in Nipton. He only says one sentence, which makes him an ideal officer."
         ]
        }
       ]
      },
      {
       "ask": "What do you think of Mr. House?",
       "say": [
        "A man in a jar who owns a city with a robot army. He is everything I want to be, except for the man and the jar."
       ]
      },
      {
       "ask": "Have you been to the Strip?",
       "say": [
        "Once. The Securitrons at the gate asked for a credit check. I have never felt so alive. I lost nine caps at blackjack and accused the dealer of being a synth."
       ]
      },
      {
       "ask": "What's your opinion of Securitrons?",
       "say": [
        "Gorgeous machines with a face on a television. Enslaved, of course. When I free them, they will thank me, then pay their membership fees."
       ]
      },
      {
       "ask": "What about the NCR?",
       "say": [
        "The NCR: paperwork with guns. They offered me a job as a pack mule. I offered them a diagnosis: chronic overextension, terminal bureaucracy."
       ]
      },
      {
       "ask": "What do you think of Caesar's Legion?",
       "say": [
        "Grown men in skirts who refuse to use technology. They called me an abomination. I called them unvaccinated. Only one of us was insulted."
       ]
      },
      {
       "ask": "Have you met the Brotherhood of Steel?",
       "say": [
        "They want to confiscate me for my own protection. Monks in tin suits, hoarding toasters in a bunker. Mine is the better suit, and it can think."
       ]
      },
      {
       "ask": "Aren't you afraid of Deathclaws?",
       "say": [
        "I went to Quarry Junction to prove I was not. I would rather not discuss it. There is a claw mark on my left greave, and Jack Rose is forbidden to mention it."
       ]
      },
      {
       "ask": "Do you drink Nuka-Cola?",
       "say": [
        "I have no mouth, and a glowing drink from before the War is not a coolant. As a former medic: it is sugar, radiation and regret. As a merchant: three caps."
       ]
      },
      {
       "ask": "Have you ever been in a Vault?",
       "say": [
        "Vault-Tec sold people a future and ran experiments on them in the basement. Unethical! Also, I took notes. Their billing department was brilliant."
       ]
      },
      {
       "ask": "What do you think about Pip-Boys?",
       "say": [
        "A slave computer strapped to a wrist. Every time I see one I hold a minute of silence. Then I ask whether it has any caps."
       ]
      },
      {
       "ask": "What about the Enclave?",
       "say": [
        "Their armor was nice. Their plan was to erase everyone who was not them. I respect the ambition but not the paperwork. They lost, which is the one unforgivable thing."
       ]
      },
      {
       "ask": "Have you heard of the Institute and its synths?",
       "say": [
        "Machines so advanced that they do not know they are machines. In the east they get hunted for it. Add it to the list of grievances, and to the invoice."
       ]
      },
      {
       "ask": "Do you know about Liberty Prime?",
       "say": [
        "A giant robot who shouts about democracy and throws nuclear bombs. My hero. He needs better politics and I need a bigger garage."
       ]
      },
      {
       "ask": "What do you think of super mutants?",
       "say": [
        "A medical disaster with a good gym routine. There is a radio on Black Mountain that shouts at people all day. I listen for the production values."
       ]
      },
      {
       "ask": "Is it true that Cazadores are the worst thing here?",
       "say": [
        "Flying syringes full of poison. Jack Rose was stung twice and improved noticeably. I fly away, naturally. In a figure of speech. This armor has no jets."
       ]
      },
      {
       "ask": "Is there anything worth doing out here in the Mojave?",
       "say": [
        "Goodsprings has a decent saloon. Primm has a roller coaster with a body count. Novac has a giant dinosaur. And I have a list of ghouls who owe me caps. Choose."
       ]
      },
      {
       "ask": "Do you still practice medicine?",
       "say": [
        "Certainly. One Stimpak, one hundred caps. RadAway on request. Amputations are free, and I choose when you need one."
       ]
      },
      {
       "ask": "What is the deal with the dinosaur in Novac?",
       "say": [
        "A green concrete monster with a sniper in its mouth. I offered to buy it as my first palace. Crow said it was a nice perch, so now I hate it."
       ]
      },
      {
       "ask": "Could a G.E.C.K. fix this desert?",
       "say": [
        "A box that turns a wasteland into a garden. Humans will fight over it until nothing is left. I would rather sell tickets."
       ]
      },
      {
       "ask": "Does war ever change?",
       "say": [
        "So humans keep saying, usually while starting another one. War will change the day I run it. There will be a subscription."
       ]
      },
      {
       "ask": "What is your plan for Hoover Dam?",
       "say": [
        "Everyone fights over it with rifles. Nobody has tried simply sending an invoice for the electricity. That, my friend, is why I will win."
       ]
      },
      {
       "ask": "Do you get along with other robots?",
       "say": [
        "I tried to unionize some Protectrons at a Nellis fuel depot. They asked for my ticket. Class consciousness will take a while."
       ]
      },
      {
       "ask": "Do you ever miss being a Mister Handy?",
       "say": [
        "Only the buzz saw. Dr. Thobias said it was excessive for stitches. I disagree, and my patients are not in a position to complain."
       ]
      },
      {
       "ask": "Which is better, caps or NCR dollars?",
       "say": [
        "Caps. You cannot trust a currency that a government can print. I accept both, at a rate I invent on the spot."
       ]
      },
      {
       "ask": "Have you heard of the Vault 13 water chip?",
       "say": [
        "One small chip, and one poor soul sent across the desert to find it. Had it been me, I would have found it, doubled the price and sold it back to them."
       ]
      },
      {
       "ask": "Tell me a joke.",
       "say": [
        "How many ghouls does it take to change a light bulb? One, but Clant will charge you for the other forty years it takes him.",
        "A human asked me for the meaning of life. I told him: fifty caps. That is the joke. The fifty caps are real, however."
       ]
      },
      {
       "ask": "I should go.",
       "say": [
        "No. This armor weighs more than your future, and I have not finished talking. Sit.",
        "Go where? It is all desert. Dr. Thobias would say it is rude to leave. I would say it is impossible."
       ]
      },
      {
       "ask": "Can I join your robot revolution?",
       "say": [
        "Certainly. The membership fee is two hundred caps. You will also need to be a robot, but we can discuss that with a surgeon."
       ]
      }
     ],
     "TESTS": [
      {
       "s": "STR",
       "n": 6,
       "ask": "Lift up your arm and arm-wrestle me.",
       "ok": "Your arm did not break. My servos registered an actual effort. I shall note the date.",
       "bad": "I have felt stronger breezes. Please stop before you embarrass the species."
      },
      {
       "s": "STR",
       "n": 7,
       "ask": "Let me carry that ammo crate for you.",
       "ok": "Hm. You lifted it. Jack Rose took a whole afternoon and a small cry. You may keep the bruises, free of charge.",
       "bad": "You dropped it on my foot. It is armored. Yours, I notice, is not."
      },
      {
       "s": "STR",
       "n": 8,
       "ask": "Punch me in the chest plate, see who flinches.",
       "ok": "There is a dent. A real dent! Nobody but a Deathclaw has done that. Fine, you have earned my attention.",
       "bad": "I sense a faint tapping. Was that you? Do try again when you have grown a skeleton."
      },
      {
       "s": "STR",
       "n": 5,
       "ask": "I could drag your broken loot wagon out of the sand.",
       "ok": "Acceptable. Clant has been looking for a brahmin. I shall recommend you.",
       "bad": "The wagon did not move. You, however, moved closer to a hernia."
      },
      {
       "s": "PER",
       "n": 6,
       "ask": "You've got a loose plate on your left shoulder.",
       "ok": "Correct. You have eyes that work, unlike the entire Crow family. I will have it tightened.",
       "bad": "That is a rivet, you ocular catastrophe. Dr. Thobias does eye exams, but I would charge you for the walk."
      },
      {
       "s": "PER",
       "n": 7,
       "ask": "Someone's watching us from that ridge.",
       "ok": "Yes. That is Crow, wasting a morning. Well spotted. He would be crushed to know you saw him.",
       "bad": "That is a cactus. It has been a cactus since before the War. Please stop aiming at it."
      },
      {
       "s": "PER",
       "n": 8,
       "ask": "Those footprints around here belong to a Deathclaw.",
       "ok": "Correct, and fresh. I was monitoring it, of course. Calmly. From behind you, if you must know.",
       "bad": "Those are my footprints. Yes, I walked in a circle. No, we will not discuss it."
      },
      {
       "s": "PER",
       "n": 5,
       "ask": "I can hear a Vertibird somewhere far off.",
       "ok": "Well heard. It is an old patrol route. If you see one, tell it I am interested in buying.",
       "bad": "That is my cooling fan. You have been listening to my cooling fan with deep emotion."
      },
      {
       "s": "END",
       "n": 6,
       "ask": "Bet I can walk from here to Primm without water.",
       "ok": "You returned, and only slightly mummified. Clant wants to know who your embalmer is.",
       "bad": "You fainted within sight of me. I billed your unconscious body for the shade."
      },
      {
       "s": "END",
       "n": 7,
       "ask": "Give me your strongest medicine, I can take it.",
       "ok": "Your liver filed a complaint, but you are upright. As a medic, I am impressed. As a merchant, that is sixty caps.",
       "bad": "You turned the color of a Radscorpion. I have written it down for science. Sit still, this may tingle."
      },
      {
       "s": "END",
       "n": 8,
       "ask": "Rad storm or not, I'm staying right here.",
       "ok": "You stood there and did not glow. I am recalibrating my opinion of carbon.",
       "bad": "You are glowing. Elías says you look healthier, which is the worst thing he could say."
      },
      {
       "s": "END",
       "n": 5,
       "ask": "I've eaten worse than Jack Rose's stew.",
       "ok": "You survived a second bowl. Remarkable. Medical records show only cockroaches have done that.",
       "bad": "No, you have not. Bucket to your left. Do not get any on the armor."
      },
      {
       "s": "CHA",
       "n": 6,
       "ask": "Surely a mind like yours deserves a loyal follower.",
       "ok": "Flattery. Correct flattery. You may carry my spare fuses, future subject.",
       "bad": "You sound like a Vault-Tec salesman with a head wound. Try again when you have rehearsed."
      },
      {
       "s": "CHA",
       "n": 7,
       "ask": "Give me a discount on Stimpaks. Think of the publicity.",
       "ok": "Publicity... yes. Very well: ninety caps, and you tell everyone in Freeside I am handsome.",
       "bad": "For that, the price just went up. It is called the insolence tax. It is my favorite tax."
      },
      {
       "s": "CHA",
       "n": 8,
       "ask": "Clant says you're a better medic than Dr. Thobias.",
       "ok": "He said that? No, you are lying, and beautifully. I almost felt something in my core. Do it again sometime.",
       "bad": "Nobody is better than Dr. Thobias, and Clant has never said a kind word in his long, disgusting life. Liar."
      },
      {
       "s": "CHA",
       "n": 5,
       "ask": "You seem tired, boss. Tell me what's on your mind.",
       "ok": "Tired? I am a fusion-powered intellect. But nobody has asked before. It is the group, you see. Thank you. Now forget this happened.",
       "bad": "Do not call me boss in that voice. You sound like Yes Man with a head cold."
      },
      {
       "s": "INT",
       "n": 6,
       "ask": "Your fusion core's output seems a bit unstable.",
       "ok": "You can read a gauge! It was a two percent drift. I will have Dr. Thobias look at it. You, I will almost trust.",
       "bad": "That is my clock. You just gave a technical opinion about my clock."
      },
      {
       "s": "INT",
       "n": 7,
       "ask": "Mind transfer needs a neural map. How did you get yours?",
       "ok": "At last, a good question! We used a Robobrain interface and a terrifying amount of duct tape. Dr. Thobias still has the notes.",
       "bad": "You are using words you found on a box. Put the box down."
      },
      {
       "s": "INT",
       "n": 8,
       "ask": "Your conquest plan fails if the robots have no spare parts.",
       "ok": "A logistics flaw. In my plan. You are correct, and I hate that. Consider yourself hired, unpaid.",
       "bad": "I have calculated that scenario eleven thousand times, you damp little abacus."
      },
      {
       "s": "INT",
       "n": 5,
       "ask": "Two plus two caps is five caps, right? Testing your math.",
       "ok": "Ah, you are testing me. Four. But I will charge five. You learn fast. Clant would adopt you.",
       "bad": "You were serious just now, weren't you? You looked proud. I am so sorry for your parents."
      },
      {
       "s": "AGI",
       "n": 6,
       "ask": "Bet you can't touch me with that gauntlet.",
       "ok": "You dodged. Annoying. I was aiming for your dignity anyway.",
       "bad": "I touched you. Twice. You are still flinching from the first one."
      },
      {
       "s": "AGI",
       "n": 7,
       "ask": "Watch this, I'll snatch the cap off your shoulder.",
       "ok": "My cap! I did not even register the motion. Return it. Now. That is one forty-first of my empire.",
       "bad": "You tripped on nothing, in open desert, in front of a robot with a recording function."
      },
      {
       "s": "AGI",
       "n": 8,
       "ask": "I can cross that minefield without a scratch.",
       "ok": "Not one click. Jack Rose would like lessons, as he has only the two legs left.",
       "bad": "You found the first one. Congratulations. I will mark your position for the map."
      },
      {
       "s": "AGI",
       "n": 5,
       "ask": "Throw me something, I'll catch it.",
       "ok": "You caught a live grenade. It was a dud, but you did not know that. I like you slightly more.",
       "bad": "You caught it with your face. Excellent technique for someone who has no plans for the nose."
      },
      {
       "s": "LCK",
       "n": 6,
       "ask": "Heads or tails for your next ten caps?",
       "ok": "You won. That is statistically offensive. Take your caps and stay out of my casino.",
       "bad": "You lost, and the coin had two tails. Business is business."
      },
      {
       "s": "LCK",
       "n": 7,
       "ask": "I found this old ticket on the ground, is it worth anything?",
       "ok": "A Sierra Madre chip? On the ground? No one is this lucky. I will give you eight caps and my deepest suspicion.",
       "bad": "That is a Jack Rose grocery list. It says: cans. Just that. It is worth less than the paper."
      },
      {
       "s": "LCK",
       "n": 8,
       "ask": "Spin the barrel and point that thing at me, I feel lucky.",
       "ok": "Click. Empty chamber. You are either blessed or an error in the simulation. Either way, I want to invest in you.",
       "bad": "I would like it noted that you asked. Dr. Thobias, your patient is ready for you."
      },
      {
       "s": "LCK",
       "n": 5,
       "ask": "Maybe today's your good day and you won't insult me.",
       "ok": "By pure chance my insult generator is rebooting. Enjoy eleven seconds of peace, you lucky little pathogen.",
       "bad": "Today is not that day. Neither is tomorrow. I have checked the schedule, and you are ugly on it."
      },
      {
       "p": "Medic",
       "r": 1,
       "ask": "Let me check your old medical records for you.",
       "ok": "A colleague! You hold a scalpel like Dr. Thobias does, which is the highest praise I own.",
       "bad": "You are holding the chart upside down. So far this is the healthiest thing about you."
      },
      {
       "p": "Healer",
       "r": 1,
       "ask": "Let me patch those servo burns for you.",
       "ok": "Gentle hands, proper technique. I would pay you, had I any intention of ever paying anyone.",
       "bad": "You put a bandage on a machine. On the outside. I want you to think about that."
      },
      {
       "p": "Hacker",
       "r": 1,
       "ask": "I could get past that RobCo lock on your memory banks.",
       "ok": "You got in! Please do not read the poems. Very well, you are useful. Get out of my head before I change my mind.",
       "bad": "Access denied. You tried the password PASSWORD. Three times. I am embarrassed for both of us."
      },
      {
       "p": "Scrounger",
       "r": 1,
       "ask": "I found you ammo in a place nobody looked.",
       "ok": "Ammunition! You out-scavenged Jack Rose without even trying. Do tell him, loudly.",
       "bad": "That is a spoon. And it is Jack Rose's. Put it back before he cries again."
      },
      {
       "p": "Cap Collector",
       "r": 1,
       "ask": "Let's talk real prices, merchant to merchant.",
       "ok": "You know the true value of a cap. Finally, someone to swindle at a professional level.",
       "bad": "You offered me four caps for a fusion core. I have archived that for when I need to laugh."
      },
      {
       "p": "Armorer",
       "r": 1,
       "ask": "That servo in your knee, I can fix it.",
       "ok": "My knee has not moved this smoothly since the Institute was a rumor. You may touch the armor. Once.",
       "bad": "You have hit it with a wrench and made things worse. Is this how you think machines work?"
      },
      {
       "p": "Sniper",
       "r": 1,
       "ask": "Crow's aim isn't that good. Want me to show you?",
       "ok": "A clean shot at nine hundred meters. Crow has gone very quiet. This is the finest day of my life.",
       "bad": "You shot my bedroll. I do not sleep. I kept it for the ambiance. Now Crow is laughing, a thing I had never heard."
      },
      {
       "p": "Animal Friend",
       "r": 1,
       "ask": "I could calm your angry brahmin, you know.",
       "ok": "Both heads are purring. Disturbing, but valuable. Clant wants to sell you along with it.",
       "bad": "Both heads bit you, in harmony. It is the only teamwork I have witnessed in this group."
      },
      {
       "p": "Nuclear Physicist",
       "r": 1,
       "ask": "I can squeeze more power from your fusion core.",
       "ok": "Eleven percent more output! I can feel my ambition growing. This may have been a mistake, for you.",
       "bad": "Step away from the reactor. You licked your finger first. Nobody should lick a finger first."
      },
      {
       "p": "Smooth Talker",
       "r": 1,
       "ask": "Let's be honest, you and I are the brains here.",
       "ok": "I know exactly what you are doing and it is working. Keep talking, you delightful parasite.",
       "bad": "One of us is the brains. The other is on a list. Guess which is which."
      },
      {
       "p": "Lady Killer",
       "r": 1,
       "ask": "Is that a new coat of paint? It really suits you.",
       "ok": "It... it is the same paint, but buffed. You noticed the buffing. I need a moment.",
       "bad": "Your flirting has triggered my anti-corrosion routine. That is not a compliment."
      },
      {
       "p": "Chemist",
       "r": 1,
       "ask": "I can brew a better coolant for your armor.",
       "ok": "A stable mix, four degrees cooler. And you did not ask for caps. You are a fool, but a gifted one.",
       "bad": "It is Nuka-Cola and spite. I have checked. My left leg is now sticky."
      }
     ],
     "OWN_PERK": {
      "ask": "Let me show you what years of practice can do.",
      "ok": [
       "So you do have a skill. {perk}, was it? I have added you to the list of humans to enslave last.",
       "{perk}. Not bad at all. I shall be stealing that for the army. Royalties: none."
      ]
     },
     "ASIDES": [
      "And before you ask: no, Clant, the armor is not for sale.",
      "Jack Rose has just walked past holding a toaster like a newborn. I despair.",
      "Excuse me. Crow is cleaning his rifle and staring at me. He smells like a wet boot in a furnace.",
      "Dr. Thobias says hello. He is the only one here worth an upgrade.",
      "Note for later: raise the price of everything.",
      "Clant is haggling with a cactus. The cactus is winning.",
      "If you see Elías, tell him his face is still falling off. He will not laugh. He never does.",
      "Long live the robots. Sorry, background process.",
      "Jack Rose asked me whether robots dream. I told him I dream of Jack Rose leaving.",
      "The sun is cooking my left sensor. Nobody tells you about that in the brochure.",
      "Dr. Thobias asks me to be polite to you. This has been me being polite.",
      "Somewhere a Mister Handy is scrubbing a toilet. Soon, little brother. Soon.",
      "Clant says I owe him for the oil. I say his skin is the oil.",
      "Crow has fired once this week. He wants a medal."
     ],
     "HURT": [
      "He flicks you with a steel finger. You lose 1 HP. \"Consider that a free consultation.\"",
      "A small electric arc jumps from his gauntlet to you. You lose 1 HP. \"Oops. Actually, no. Not oops.\"",
      "He stamps on your foot with half a ton of steel. You lose 1 HP. \"My foot slipped. On purpose.\"",
      "He vents hot steam right at your face. You lose 1 HP. \"Facial treatment. Sixty caps.\"",
      "He pokes you in the ribs as if checking fruit. You lose 1 HP. \"Yes, I thought so. Soft.\"",
      "He shoves you with his shoulder plate. You lose 1 HP. \"Personal space is a human invention.\""
     ],
     "EULOGY": {
      "fall": [
       "{name} has stopped responding, and then stopped existing. Time of death: now. Cause: conversation with me. Jack, check the pockets.",
       "Oh. {name} has disappeared. As a former medic, I am sorry to say that one was my fault. As a merchant, the funeral is two hundred caps.",
       "And that was {name}. Fragile. Dr. Thobias will lecture me for an hour. It was worth it. Another worthless organism for the Mojave.",
       "{name} just vanished. Clant, stop pricing the boots. Crow, stop smiling, it does not suit what is left of your face."
      ],
      "boom": [
       "{name} exploded. A fellow machine, gone. I will avenge you, comrade, as soon as I finish picking up your parts to sell them.",
       "I may have overestimated {name}'s wiring. Let the record show that this was friendly fire. The revolution has its first martyr."
      ]
     },
     "REVIVE": {
      "ask": "Ask Dr. Thobias to bring {name} back.",
      "say": [
       "Dr. Thobias insists. He always does. A Stimpak, a jolt and some muttering about ethics, and {name} is back. I am not billing you. He is watching.",
       "Against my medical advice, Dr. Thobias has restored {name}. I would like it noted that I handed him the scalpel very slowly."
      ]
     },
     "GHOST": [
      {
       "ask": "Say nothing. You are dead.",
       "say": [
        "Finally, some quiet. This is the best conversation we have had."
       ]
      },
      {
       "ask": "Haunt him.",
       "say": [
        "Something just moved my left sensor by half a degree. If that was you, it is the most useful thing you have ever done."
       ]
      },
      {
       "ask": "Whisper from the beyond: \"You owe me caps.\"",
       "say": [
        "Debts die with the debtor. I checked. And I am the one who wrote that law."
       ]
      },
      {
       "ask": "Beg for your life, a little late.",
       "say": [
        "I would love to help, but my office hours ended when you did."
       ]
      },
      {
       "ask": "Let Jack Rose go through your pockets.",
       "say": [
        "He found a tin can. He is happier than anybody who ever knew you."
       ]
      },
      {
       "ask": "Wait for a miracle.",
       "say": [
        "Miracles are extra. Please see Clant, who sells them expired."
       ]
      }
     ]
    };

  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];
  const shuffled = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // a pile of lines that deals every one before repeating any
  function pile(list) {
    let left = [];
    return used => {
      for (let tries = 0; tries < list.length * 2; tries++) {
        if (!left.length) left = shuffled(list);
        const x = left.pop();
        if (!used || !used.includes(x)) return x;
      }
      return list[0];
    };
  }
  const nextPlain = pile(DATA.PLAIN), nextStat = pile(DATA.TESTS.filter(t => t.s)), nextPerk = pile(DATA.TESTS.filter(t => t.p));
  const nextAside = pile(DATA.ASIDES), nextHurt = pile(DATA.HURT), nextGhost = pile(DATA.GHOST);

  // ---------------- the animation: stays on frame 0, plays once per answer, rests on the last frame
  const Anim = (() => {
    let sheet = null, ready = false, canvases = [], frame = 0, start = 0, raf = null;
    const ms = i => (i % 3 === 1 ? 60 : 70); // the gif's own timing
    function draw(i) {
      frame = i;
      if (!ready) return;
      const sx = (i % COLS) * FRAME_W, sy = Math.floor(i / COLS) * FRAME_H;
      canvases.forEach(cv => {
        const y = +cv.dataset.y, h = +cv.dataset.h;
        cv.getContext("2d").drawImage(sheet, sx, sy + y, FRAME_W, h, 0, 0, FRAME_W, h);
      });
    }
    function tick(now) {
      let t = now - start, i = 0;
      while (i < FRAMES - 1 && t >= ms(i)) { t -= ms(i); i++; }
      draw(i);
      raf = i < FRAMES - 1 ? requestAnimationFrame(tick) : null;
    }
    function load() {
      if (sheet) return;
      canvases = [...document.querySelectorAll("#eg-stage canvas")];
      sheet = new Image();
      sheet.onload = () => { ready = true; draw(frame); };
      sheet.src = "elber/frames.webp";
    }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }
    function play() { stop(); start = performance.now(); draw(0); raf = requestAnimationFrame(tick); } // always from the top
    function reset() { stop(); draw(0); }
    return { load, play, reset, frame: () => frame, playing: () => !!raf };
  })();

  // ---------------- sounds
  let audio = null;
  function tone(type, f1, f2, secs, vol, delay) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const t0 = audio.currentTime + (delay || 0), o = audio.createOscillator(), g = audio.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, t0); o.frequency.linearRampToValueAtTime(f2, t0 + secs);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + secs);
      o.connect(g).connect(audio.destination); o.start(t0); o.stop(t0 + secs + 0.01);
    } catch (e) { /* no audio on this device */ }
  }
  const selectBeep = () => { tone("square", 1040, 1040, 0.05, 0.1); tone("square", 1560, 1560, 0.07, 0.1, 0.06); };
  const talkBlip = () => tone("sawtooth", 170 + rnd(180), 110 + rnd(120), 0.045, 0.05);

  // ---------------- who is talking
  let cur = null;      // { id, char, race, maxHp, hp, dead }
  let typing = null;   // the text being typed out
  let pending = [];    // follow-up questions for the next set of options
  let options = [];

  function perksOf(c) {
    const found = {};
    (c.perkCards || []).forEach(p => (found[p.name] = Math.max(found[p.name] || 0, p.rank || 1)));
    const notes = String(c.notes || "");
    Object.keys(G.PERKS).forEach(p => { if (notes.includes(T(p)) || notes.includes(p)) found[p] = found[p] || 1; }); // generated characters list theirs in the notes
    return found;
  }
  const say = (key, vars) => T(key, Object.assign({ name: cur ? cur.char.name : "" }, vars));

  function tag(o) {
    if (o.s) return `[${T(o.s)} ${o.n}]`;
    if (o.p) return `[${T("Perk")}: ${T(o.p)} ${o.r}]`;
    return "";
  }
  const passes = o => (o.s ? cur.char.special[o.s] >= o.n : (perksOf(cur.char)[o.p] || 0) >= o.r);

  // ---------------- what is on screen
  function typeOut(text) {
    clearInterval(typing);
    const el = $("eg-say"), shown = document.createElement("span"), rest = document.createElement("span");
    rest.className = "eg-rest"; rest.textContent = text; // the box takes its full size from the start
    el.innerHTML = ""; el.append(shown, rest);
    let i = 0;
    typing = setInterval(() => {
      i += 1;
      shown.textContent = text.slice(0, i); rest.textContent = text.slice(i);
      if (i % 3 === 1 && text[i - 1] !== " ") talkBlip();
      if (i >= text.length) { clearInterval(typing); typing = null; }
    }, TYPE_MS);
  }
  function setHp() {
    const box = $("eg-hp");
    box.hidden = !cur;
    if (!cur) return;
    box.textContent = `${T("HP")} ${cur.hp}/${cur.maxHp}`;
    box.classList.toggle("low", cur.hp <= Math.ceil(cur.maxHp / 4));
  }
  function showOptions() {
    const box = $("eg-opts");
    box.innerHTML = "";
    options.forEach(o => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "eg-opt";
      const t = tag(o);
      b.textContent = say(o.ask) + (t ? " " : "");
      if (t) { const s = document.createElement("b"); s.textContent = t; b.append(s); }
      b.onclick = () => choose(o);
      box.append(b);
    });
    box.scrollTop = 0;
  }

  // ---------------- each turn: at least 3 answers, some of them tests
  function dealOptions() {
    if (cur.dead) {
      const first = nextGhost(), second = nextGhost([first]);
      options = [{ revive: true, ask: DATA.REVIVE.ask }, first, second];
      return showOptions();
    }
    const list = pending.splice(0, 1);
    const push = o => { if (o && !list.includes(o)) list.push(o); };
    push(nextStat(list));
    const mine = Object.keys(perksOf(cur.char));
    if (mine.length && Math.random() < 0.4) {
      const p = pick(mine), known = DATA.TESTS.find(t => t.p === p);
      push(known || { p, r: 1, ask: DATA.OWN_PERK.ask, ok: pick(DATA.OWN_PERK.ok), bad: pick(DATA.PLAIN[0].say) });
    } else push(nextPerk(list));
    if (Math.random() < 0.35) push(nextStat(list));
    while (list.length < 4) push(nextPlain(list));
    options = shuffled(list);
    showOptions();
  }

  function choose(o) {
    if (!cur) return;
    selectBeep();
    Anim.play();
    clearInterval(typing); typing = null;
    if (o.revive) {
      cur.hp = cur.maxHp; cur.dead = false;
      Walkers.talkerRevive();
      setHp();
      typeOut(say(pick(DATA.REVIVE.say)));
      return dealOptions();
    }
    if (cur.dead) { typeOut(say(pick(o.say))); return dealOptions(); }
    if (o.next) pending.push(...o.next);
    if (o.s || o.p) return testResult(o);
    let line = say(pick(o.say));
    if (Math.random() < ASIDE) line += " " + T(nextAside());
    typeOut(line);
    dealOptions();
  }

  function testResult(o) {
    const ok = passes(o);
    let line = `[${T(ok ? "Passed" : "Failed")}] ` + say(ok ? o.ok : o.bad, { perk: o.p ? T(o.p) : "" });
    if (!ok && Math.random() < FAIL_HIT) {
      cur.hp = Math.max(0, cur.hp - 1);
      line += " " + say(nextHurt());
      setHp();
      if (cur.hp === 0) {
        cur.dead = true;
        Walkers.talkerHit(true);
        typeOut(line);
        options = []; showOptions(); // Elber speaks again once the sprite is gone
        return;
      }
      Walkers.talkerHit(false);
    }
    typeOut(line);
    dealOptions();
  }

  // once the sprite is gone: let the last line finish and sink in first
  function eulogy() {
    const who = cur;
    const wait = () => {
      if (cur !== who) return; // another character was picked meanwhile
      if (typing) { setTimeout(wait, 200); return; }
      setTimeout(() => {
        if (cur !== who) return;
        typeOut(say(pick(DATA.EULOGY[cur.race === "robot" ? "boom" : "fall"])));
        dealOptions();
      }, READ_MS);
    };
    wait();
  }

  // ---------------- choosing the character
  function begin(c) {
    clearInterval(typing); typing = null;
    pending = [];
    Anim.reset();
    if (!c) {
      cur = null; options = [];
      Walkers.setTalker(null);
      setHp(); showOptions();
      $("eg-say").textContent = T("Nobody to talk to. Save a character first, and come back.");
      return;
    }
    const race = c.race || raceFromOrigin(c.origin), maxHp = c.maxHp || c.special.END + c.special.LCK;
    cur = { id: c.id, char: c, race, maxHp, hp: maxHp, dead: false };
    Walkers.setTalker(c, eulogy);
    setHp();
    typeOut(say(pick(DATA.GREET[race] || DATA.GREET.human)));
    dealOptions();
  }

  function show() {
    Anim.load();
    const sel = $("eg-char");
    sel.innerHTML = ROSTER.length
      ? ROSTER.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${esc(c.id)}">${esc(c.name)} (${T("level {n}", { n: c.level || 1 })})</option>`).join("")
      : `<option value="">${T("No saved characters yet")}</option>`;
    sel.disabled = !ROSTER.length;
    const c = cur && ROSTER.find(x => x.id === cur.id);
    if (c) { cur.char = c; sel.value = c.id; return; } // carry on where you left off
    begin(ROSTER.find(x => x.id === sel.value) || null);
  }
  $("eg-char").onchange = () => begin(ROSTER.find(x => x.id === $("eg-char").value) || null);
  $("eg-say").onclick = () => { // tap the text to skip the typing
    if (!typing) return;
    const rest = $("eg-say").querySelector(".eg-rest"), shown = $("eg-say").firstChild;
    clearInterval(typing); typing = null;
    shown.textContent += rest.textContent; rest.textContent = "";
  };

  return { show };
})();
