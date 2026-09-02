package seed

import (
	"backend/config"
	"backend/models"
	"log"
	"os"
	"strings"
	"time"
)

type chapterSeed struct {
	Number   int
	Title    string
	CoinCost int
	Content  string
}

type storySeed struct {
	Title       string
	Description string
	Genre       string
	CoverColor  string
	AuthorEmail string
	TagNames    []string
	Chapters    []chapterSeed
}

func Run() {
	if os.Getenv("SEED_FORCE") == "true" {
		clearCatalog()
		log.Println("Cleared existing catalog for re-seed")
	}
	seedCatalog()
	seedForum()
}

func clearCatalog() {
	config.DB.Exec("DELETE FROM chapter_unlocks")
	config.DB.Exec("DELETE FROM story_tags")
	config.DB.Exec("DELETE FROM chapters")
	config.DB.Exec("DELETE FROM stories")
}

func seedCatalog() {
	authors := ensureAuthors()
	catalog := buildCatalog()

	added := 0
	for _, entry := range catalog {
		author, ok := authors[entry.AuthorEmail]
		if !ok {
			log.Printf("seed: unknown author %s for %q", entry.AuthorEmail, entry.Title)
			continue
		}

		var existing models.Story
		result := config.DB.Where("title = ?", entry.Title).Limit(1).Find(&existing)
		if result.RowsAffected > 0 {
			continue
		}

		story := models.Story{
			Title:           entry.Title,
			Description:     entry.Description,
			Genre:           entry.Genre,
			CoverColor:      entry.CoverColor,
			AuthorID:        author.ID,
			Rating:          "teen",
			Language:        "English",
			Status:          "published",
			CommentsEnabled: true,
		}
		if err := config.DB.Create(&story).Error; err != nil {
			log.Println("seed story error:", err)
			continue
		}

		now := time.Now()
		for _, ch := range entry.Chapters {
			chapter := models.Chapter{
				StoryID:     story.ID,
				Number:      ch.Number,
				Title:       ch.Title,
				CoinCost:    ch.CoinCost,
				Content:     plainTextSeedToHTML(ch.Content),
				PublishedAt: &now,
			}
			config.DB.Create(&chapter)
		}

		attachTags(story.ID, entry.TagNames)
		added++
	}

	if added > 0 {
		log.Printf("Seeded %d stories", added)
	} else {
		log.Println("Catalog up to date (set SEED_FORCE=true to wipe and re-seed)")
	}
}

func ensureAuthors() map[string]models.User {
	specs := []models.User{
		{
			Email:       "mira@whatsinmylibrary.local",
			FullName:    "Mira Chen",
			Username:    "mirachen",
			Bio:         "Fantasy and romance with too many feelings and not enough sleep.",
			AvatarColor: "#7c3aed",
			Provider:    "seed",
		},
		{
			Email:       "jordan@whatsinmylibrary.local",
			FullName:    "Jordan Reyes",
			Username:    "jreyes",
			Bio:         "Sci-fi, horror, and the occasional happy ending I swear I didn't plan.",
			AvatarColor: "#0ea5e9",
			Provider:    "seed",
		},
		{
			Email:       "sam@whatsinmylibrary.local",
			FullName:    "Sam Okonkwo",
			Username:    "samwrites",
			Bio:         "Contemporary fiction and mysteries set in cities that feel a little too real.",
			AvatarColor: "#64748b",
			Provider:    "seed",
		},
		{
			Email:       "alex@whatsinmylibrary.local",
			FullName:    "Alex Kim",
			Username:    "alexkm",
			Bio:         "AU fanfics, YA chaos, and characters who absolutely should not kiss (but will).",
			AvatarColor: "#ec4899",
			Provider:    "seed",
		},
		{
			Email:       "priya@whatsinmylibrary.local",
			FullName:    "Priya Sharma",
			Username:    "priyasharma",
			Bio:         "Historical romance and epistolary stories. Letters are my love language.",
			AvatarColor: "#e11d48",
			Provider:    "seed",
		},
		{
			Email:       "luca@whatsinmylibrary.local",
			FullName:    "Luca Martinez",
			Username:    "lucam",
			Bio:         "Queer contemporary fiction — soft moments, sharp dialogue, bad decisions.",
			AvatarColor: "#0d9488",
			Provider:    "seed",
		},
	}

	out := make(map[string]models.User, len(specs))
	for _, spec := range specs {
		author := spec
		config.DB.Where(models.User{Email: author.Email}).FirstOrCreate(&author)
		out[author.Email] = author
	}
	return out
}

func buildCatalog() []storySeed {
	return []storySeed{
		{
			Title:       "The Last Lantern Keeper",
			Description: "In a city where memories are traded like currency, a young keeper discovers a lantern that burns with someone else's forgotten past.",
			Genre:       "Fantasy",
			CoverColor:  "#7c3aed",
			AuthorEmail: "mira@whatsinmylibrary.local",
			TagNames:    []string{"slow burn", "found family", "magic system", "angst"},
			Chapters: []chapterSeed{
				{1, "Ash Market", 0, "The ash market opened before dawn, when the sky was still the color of old parchment. Elara pulled her scarf tighter and walked between stalls where vendors sold bottled laughter, folded regrets, and the occasional genuine smile.\n\nShe wasn't here to buy. She was here because the lantern in her satchel had started humming again — a low, persistent vibration that felt like a warning."},
				{2, "Borrowed Light", 0, "The lantern's flame wasn't orange or yellow. It was silver-blue, the color of moonlight on a river you couldn't name. When Elara lifted the glass, the flame didn't flicker. It pulsed, like a heartbeat that didn't belong to her.\n\n\"That's not yours,\" the old woman at the memory stall said without looking up. \"And whatever it remembers, it remembers loudly.\""},
				{3, "The Debt", 5, "Every memory has a price. Elara had learned that young. But the lantern's memory wasn't priced in coins — it was priced in time. Each hour she kept it lit, something small disappeared from her own past.\n\nBy noon she couldn't remember her mother's soup recipe. That frightened her more than the debt itself."},
				{4, "City of Glass", 8, "The upper district glittered with towers that refracted sunlight into rainbows no one stopped to admire. Here, memories were luxury goods. Elara climbed the service stairs, the lantern growing heavier with each step.\n\nAt the top floor, a door stood open. Inside, a man sat surrounded by hundreds of lanterns, all burning silver-blue."},
				{5, "What the Light Remembers", 10, "The man's name was Corin, and he had been waiting thirty years for someone reckless enough to carry a stolen lantern to his door. \"It remembers a war,\" he said. \"One we agreed to forget.\"\n\nElara set the lantern on the table. For the first time, the flame turned gold."},
			},
		},
		{
			Title:       "Crown of Thorns and Starlight",
			Description: "A blacksmith's apprentice inherits a cursed crown and accidentally binds herself to the exiled prince everyone thinks is dead.",
			Genre:       "Fantasy",
			CoverColor:  "#9333ea",
			AuthorEmail: "mira@whatsinmylibrary.local",
			TagNames:    []string{"enemies to lovers", "found family", "magic system", "hurt/comfort"},
			Chapters: []chapterSeed{
				{1, "The Forge at Midnight", 0, "The crown arrived in a box of nails. No note, no seal — just cold metal that made the forge fire turn green.\n\nNessa should have melted it down. Instead she tried it on, and the ghost of a prince appeared in the smoke, looking very annoyed and very alive."},
				{2, "Terms of Binding", 0, "Binding magic, the prince explained, was inconveniently literal. She couldn't remove the crown. He couldn't leave her side. And somewhere in the capital, people who wanted him dead were celebrating his funeral.\n\n\"We have three days,\" he said. \"Try not to get us both executed.\""},
				{3, "Road of Exiles", 6, "They left before sunrise with stolen horses and a map drawn on the inside of a boot. Nessa had never been farther than the market square. The prince had never ridden without an escort.\n\nBy nightfall they were lost, arguing about north, and sharing the last of the bread like it was a treaty."},
			},
		},
		{
			Title:       "Coffee Shop at the End of the World",
			Description: "Every Tuesday, the same five strangers meet at a café that shouldn't exist. Today, the barista says they're out of time.",
			Genre:       "Sci-Fi",
			CoverColor:  "#0284c7",
			AuthorEmail: "jordan@whatsinmylibrary.local",
			TagNames:    []string{"time travel", "found family", "dual POV", "hurt/comfort"},
			Chapters: []chapterSeed{
				{1, "Tuesday Again", 0, "The bell above the door chimed exactly at 4:17 PM, same as every Tuesday for six months. Juno looked up and counted the regulars: one, two, three, four, five.\n\nThe café smelled like cinnamon and static. Outside the window, the city looked normal. Inside, the clock had stopped at 4:17 three weeks ago."},
				{2, "Out of Time", 6, "\"We're out of time,\" the barista said, setting down five cups that steamed in colors that didn't exist. \"Not coffee. Time. Literally.\"\n\nNo one laughed. They just looked at each other with the tired recognition of people who had been pretending this was a coincidence for far too long."},
				{3, "The Exit Interview", 8, "Each of them, it turned out, had been pulled out of a moment they were about to ruin — a text sent too late, a bridge almost jumped from, a lab accident one second from detonation.\n\nThe café was a waiting room between versions of their lives. Tuesday was when they got to choose which one to return to."},
			},
		},
		{
			Title:       "Static Between Stars",
			Description: "A radio operator on a dying colony ship picks up a distress signal from her own voice, dated fifty years in the future.",
			Genre:       "Sci-Fi",
			CoverColor:  "#0369a1",
			AuthorEmail: "jordan@whatsinmylibrary.local",
			TagNames:    []string{"time travel", "mystery", "dual POV", "angst"},
			Chapters: []chapterSeed{
				{1, "Signal Lag", 0, "The message repeated every eleven minutes: coordinates, a warning, and a laugh that made Rin's skin crawl because it was hers.\n\nShe checked the timestamp twice. The signal claimed to originate from 2079. The ship's clock said 2029."},
				{2, "Future Conditional", 5, "Command wanted to ignore it. Rin logged the frequency anyway and traced it to a debris field they weren't scheduled to pass for another three weeks.\n\nWhen they arrived early, the field was empty. Her headset crackled. \"Took you long enough,\" her future self said."},
			},
		},
		{
			Title:       "Letters Never Sent",
			Description: "She finds a box of unsent letters in her grandmother's attic — all addressed to the same person, all signed with her own name.",
			Genre:       "Romance",
			CoverColor:  "#f43f5e",
			AuthorEmail: "priya@whatsinmylibrary.local",
			TagNames:    []string{"slow burn", "historical", "dual POV", "fluff"},
			Chapters: []chapterSeed{
				{1, "The Attic Box", 0, "The letters were tied with a faded blue ribbon. Dozens of them, each envelope yellowed at the edges, each addressed in handwriting that shifted from decade to decade.\n\nAll to the same name. All signed with love — and her name, in every variation she'd ever used."},
				{2, "The First Letter", 4, "The earliest letter was dated 1952. She hadn't been born yet. Yet the voice inside was unmistakably hers — curious, stubborn, a little afraid of how much she felt.\n\n\"Dear Soren,\" it began. \"The river looked like melted copper tonight, and I thought of you.\""},
				{3, "Soren Replies", 6, "Hidden beneath the false bottom of the box: his letters back. Never mailed. Never thrown away.\n\nReading them felt like eavesdropping on a conversation across time — two people trying to find each other in a world that kept rearranging the furniture."},
			},
		},
		{
			Title:       "Saltwater Bones",
			Description: "Two rival lifeguards share a summer tower, a town secret, and the slow realization that hate is just fear in a swimsuit.",
			Genre:       "Romance",
			CoverColor:  "#14b8a6",
			AuthorEmail: "mira@whatsinmylibrary.local",
			TagNames:    []string{"enemies to lovers", "contemporary", "fluff", "dual POV"},
			Chapters: []chapterSeed{
				{1, "Tower Shift", 0, "The town hired them both because nobody else applied. Mara had the certifications. Eli had the reputation. The tower was too small for two chairs and one ego.\n\n\"Don't touch my whistle,\" Mara said.\n\n\"Don't touch my sanity,\" Eli replied."},
				{2, "Undertow", 4, "The riptide warning wasn't on the board because the board was broken — someone kept removing the flags. Mara and Eli noticed at the same time, and for one breath they stopped being rivals."},
				{3, "High Tide Confessions", 7, "After the rescue, sitting on the tower steps with sand in their hair, Eli said, \"I wasn't trying to show you up. I was trying to prove I belong here.\"\n\nMara looked at the ocean. \"Me too,\" she admitted. \"I've just been louder about it.\""},
			},
		},
		{
			Title:       "Matcha & Misunderstandings",
			Description: "A grumpy tea shop owner and the food blogger who gave him three stars keep running into each other at the worst possible moments.",
			Genre:       "Romance",
			CoverColor:  "#f97316",
			AuthorEmail: "luca@whatsinmylibrary.local",
			TagNames:    []string{"slow burn", "contemporary", "fluff", "hurt/comfort"},
			Chapters: []chapterSeed{
				{1, "Three Stars", 0, "The review went viral for all the wrong reasons: \"Perfect matcha, catastrophic service, owner stared at me like I personally invented Yelp.\"\n\nKenji printed it out and taped it inside the register. If the universe wanted to send him a nemesis, fine. He would outlive them both."},
				{2, "Same Train, Different Car", 0, "They met again on the 7:15, both running for the closing doors, both holding the same limited-edition pastry box from the shop across town.\n\n\"You,\" they said in unison, which was somehow worse than being alone."},
				{3, "A Second Tasting", 5, "She came back with a notebook and an apology draft she never read aloud. He served her matcha in the good cups — the ones he didn't use for critics.\n\n\"Still three stars?\" he asked.\n\n\"Maybe three and a half,\" she said. \"Depending on the ending.\""},
			},
		},
		{
			Title:       "The House on Hollow Lane",
			Description: "A true-crime podcaster moves into a cheap rental and discovers the previous tenant left audio logs that shouldn't exist.",
			Genre:       "Mystery",
			CoverColor:  "#475569",
			AuthorEmail: "sam@whatsinmylibrary.local",
			TagNames:    []string{"horror", "mystery", "unreliable narrator", "angst"},
			Chapters: []chapterSeed{
				{1, "Move-In Day", 0, "The landlord said the last tenant left in a hurry. That explained the boxes in the closet and the USB drive taped beneath the desk drawer.\n\nOn it: forty-seven audio files, each labeled with a date that hadn't happened yet."},
				{2, "File 048", 5, "The voice on the recording was hers. Not similar. Identical. She listened to herself describe the scratch on the kitchen floor she'd noticed ten minutes ago, then warn herself not to open the basement door."},
				{3, "Basement Door", 8, "She opened it anyway. Podcasters, she told herself, were professionally curious. The stairs went down farther than the blueprint suggested.\n\nAt the bottom, a second recorder was running. The red light blinked like a heartbeat."},
			},
		},
		{
			Title:       "The Librarian's Alibi",
			Description: "When a rare manuscript vanishes from a university archive, the only person without a solid alibi is the librarian who catalogued it.",
			Genre:       "Mystery",
			CoverColor:  "#334155",
			AuthorEmail: "sam@whatsinmylibrary.local",
			TagNames:    []string{"mystery", "contemporary", "slow burn", "dual POV"},
			Chapters: []chapterSeed{
				{1, "Missing Folio", 0, "The manuscript had survived four wars and one flood. It disappeared on a Tuesday during a fire drill when every exit was accounted for and every camera was, inconveniently, offline.\n\nDetective Morales looked at the checkout log. One name appeared in three different handwriting styles."},
				{2, "Quiet Stacks", 4, "Clara had alibis for two of the handwriting samples. The third was hers from a decade ago, before she changed her name and moved cities.\n\nSomeone was framing her with her own past. The question was who still had access to it."},
			},
		},
		{
			Title:       "Princess of the Wrong Kingdom",
			Description: "The chosen one gets the prophecy wrong on purpose — and accidentally starts a revolution.",
			Genre:       "Fanfiction",
			CoverColor:  "#db2777",
			AuthorEmail: "alex@whatsinmylibrary.local",
			TagNames:    []string{"enemies to lovers", "alternate universe", "fluff", "slow burn"},
			Chapters: []chapterSeed{
				{1, "Wrong Chosen One", 0, "The prophecy said the savior would arrive on a white horse at dawn. Kira arrived on a stolen delivery bike at noon, wearing someone else's crown and eating someone else's pastry.\n\nThe court stared. She shrugged. \"Traffic.\""},
				{2, "Accidental Coup", 3, "Kira hadn't meant to redistribute the royal grain stores. She'd meant to find the kitchen. But the servants cheered, the guards hesitated, and the prince laughed for the first time in years."},
				{3, "Treaty of Crumbs", 6, "Peace negotiations happened over breakfast because Kira refused to sit at the war table before eating. By the third pastry, the prince had stopped calling her an impostor and started calling her by name."},
			},
		},
		{
			Title:       "Academy of Untamed Things",
			Description: "A transfer student discovers her roommate is secretly the dragon the academy was built to contain.",
			Genre:       "Fanfiction",
			CoverColor:  "#c026d3",
			AuthorEmail: "alex@whatsinmylibrary.local",
			TagNames:    []string{"found family", "alternate universe", "fluff", "magic system"},
			Chapters: []chapterSeed{
				{1, "Room 7B", 0, "The roommate agreement banned open flames, overnight guests, and \"unauthorized mythological transformations.\" Vesper signed it without reading and met Sable, who had scales along her forearms and very good taste in playlists.\n\n\"Please don't tell anyone,\" Sable said. \"I'm on academic probation for incinerating a desk.\""},
				{2, "Midterm in the Boiler Room", 5, "The practical exam required summoning a familiar. Vesper's options were a pigeon with attitude or her roommate in a very illegal true form.\n\nSable sighed, rolled her shoulders, and the room got very warm very fast."},
			},
		},
		{
			Title:       "Things That Watch From the Corners",
			Description: "After moving back to her hometown, Nina realizes the childhood game 'don't look at the corners' wasn't a game.",
			Genre:       "Horror",
			CoverColor:  "#1e293b",
			AuthorEmail: "jordan@whatsinmylibrary.local",
			TagNames:    []string{"horror", "unreliable narrator", "angst", "contemporary"},
			Chapters: []chapterSeed{
				{1, "Home Again", 0, "The house looked smaller and the corners looked larger. Nina told herself that was normal — perspective, age, the way memory lied.\n\nThen she saw her niece playing the old game alone, whispering, \"You looked. You looked. You looked.\""},
				{2, "Peripheral", 4, "You weren't supposed to look directly. That was the rule. Looking invited them in, her brother used to say, before he stopped coming home.\n\nNina looked anyway. Something in the corner blinked back."},
			},
		},
		{
			Title:       "The Silk Road Diaries",
			Description: "In 1842, a merchant's daughter disguises herself as her brother to escort a shipment — and falls for the caravan guide who sees through the lie.",
			Genre:       "Historical",
			CoverColor:  "#b45309",
			AuthorEmail: "priya@whatsinmylibrary.local",
			TagNames:    []string{"historical", "slow burn", "dual POV", "hurt/comfort"},
			Chapters: []chapterSeed{
				{1, "Ledger of Names", 0, "The ledger listed two sons. In reality, Lei had a brother who didn't want the road and a father who didn't want excuses.\n\nShe cut her hair, borrowed his seal, and signed the contract before anyone could argue with arithmetic."},
				{2, "Caravan Rules", 0, "Roshan didn't expose her on the first day. He just handed her a scarf and said, \"The wind here reports everything. Learn to lie to it.\"\n\nBy the second week, she trusted him more than the map."},
				{3, "Pass of Echoes", 7, "Bandits wanted the silk. The pass wanted a toll of truths. Lei's voice, when asked her name, shook only once.\n\nRoshan stepped in front of her and told the pass a story about a brother and sister who had already paid enough."},
			},
		},
		{
			Title:       "Boys Who Dance in Parking Lots",
			Description: "Two ex-best friends reconnect when their small town's only queer youth group meets in the back of a closed Blockbuster.",
			Genre:       "LGBT+",
			CoverColor:  "#059669",
			AuthorEmail: "luca@whatsinmylibrary.local",
			TagNames:    []string{"contemporary", "found family", "fluff", "hurt/comfort"},
			Chapters: []chapterSeed{
				{1, "Return Policy", 0, "The Blockbuster sign still lit up on Fridays even though the store had been empty for years. Inside, folding chairs, a portable speaker, and twelve kids who knew each other's secrets before they knew their majors.\n\nTheo saw Marco by the horror aisle and forgot how to breathe."},
				{2, "Choreography", 0, "They didn't talk about the fight. They talked around it while teaching the group a stupid TikTok dance in the parking lot, under sodium lights and stars that felt closer here than in the city.\n\nMarco's hand found Theo's on the third beat. Neither pulled away."},
				{3, "Closing Time", 5, "\"We can't keep doing this in a dead video store,\" Marco said.\n\nTheo smiled. \"So let's find a living one. Together.\""},
			},
		},
		{
			Title:       "Senior Year Survival Algorithm",
			Description: "A high school senior builds an app to optimize her last year — then it starts predicting things that haven't happened yet.",
			Genre:       "YA",
			CoverColor:  "#eab308",
			AuthorEmail: "alex@whatsinmylibrary.local",
			TagNames:    []string{"contemporary", "dual POV", "fluff", "slow burn"},
			Chapters: []chapterSeed{
				{1, "Version 1.0", 0, "The app was supposed to schedule study blocks and remind her to eat lunch. By Wednesday it was ranking friendships by \"long-term viability\" and suggesting she sit next to Noah Park in calculus.\n\nShe hadn't told it about her crush. It figured that out on its own."},
				{2, "Predictive Text", 4, "The notification read: Avoid east hallway Thursday 2:14 PM. No context. No override.\n\nAt 2:13 she was in the east hallway anyway, because some part of her wanted to know if the app was wrong or if she was."},
			},
		},
		{
			Title:       "Thirteen Ways to Lose a Ghost",
			Description: "A grief counselor's new client insists her dead wife is still sending texts — and the timestamps prove it.",
			Genre:       "Contemporary",
			CoverColor:  "#6366f1",
			AuthorEmail: "sam@whatsinmylibrary.local",
			TagNames:    []string{"hurt/comfort", "contemporary", "slow burn", "dual POV"},
			Chapters: []chapterSeed{
				{1, "Intake Form", 0, "The messages arrived at 3:33 AM with perfect grammar and inside jokes no one else knew. Dani brought them to session on a cracked phone and said, very calmly, \"I think she's not done talking to me.\"\n\nDr. Ellis had a professional response ready. It died somewhere between the first screenshot and the last."},
				{2, "Message Pending", 6, "They traced the number to a carrier that didn't exist. The texts stopped when Dani skipped session and started when she came back, like whatever was on the other end respected the schedule.\n\n\"If this is grief,\" Dani said, \"it's the most helpful grief I've ever met.\""},
			},
		},
	}
}

func seedForum() {
	categories := []models.ForumCategory{
		{Name: "General", Slug: "general", Description: "Introduce yourself, chat about anything reading-related."},
		{Name: "Recommendations", Slug: "recommendations", Description: "Ask for recs or share hidden gems."},
		{Name: "Writing & Craft", Slug: "writing", Description: "Plot holes, pacing, betas, and publishing talk."},
		{Name: "Fanfiction Corner", Slug: "fanfiction", Description: "AUs, ships, tropes — fanfic readers welcome."},
		{Name: "Site Feedback", Slug: "feedback", Description: "Bugs, feature requests, and wild ideas."},
	}
	for _, cat := range categories {
		c := cat
		config.DB.Where(models.ForumCategory{Slug: c.Slug}).FirstOrCreate(&c)
	}

	var count int64
	config.DB.Model(&models.ForumThread{}).Count(&count)
	if count > 0 {
		return
	}

	var general, recs models.ForumCategory
	config.DB.Where("slug = ?", "general").First(&general)
	config.DB.Where("slug = ?", "recommendations").First(&recs)

	var mira models.User
	config.DB.Where("email = ?", "mira@whatsinmylibrary.local").First(&mira)

	threads := []models.ForumThread{
		{
			CategoryID: general.ID,
			UserID:     mira.ID,
			Title:      "What are you reading this week?",
			Body:       "Drop your current fic or book! I'm on chapter 3 of Saltwater Bones and emotionally compromised.",
		},
		{
			CategoryID: recs.ID,
			UserID:     mira.ID,
			Title:      "Looking for slow-burn fantasy with found family",
			Body:       "Hit me with your best recs — bonus points if there's a magic system that makes sense and at least one sad lantern.",
		},
	}
	for _, t := range threads {
		config.DB.Create(&t)
	}
	log.Println("Seeded forum categories and starter threads")
}

func attachTags(storyID uint, names []string) {
	var tags []models.Tag
	for _, name := range names {
		tag := models.Tag{Name: name, Slug: slugify(name)}
		config.DB.Where(models.Tag{Slug: tag.Slug}).FirstOrCreate(&tag)
		tags = append(tags, tag)
	}
	config.DB.Model(&models.Story{ID: storyID}).Association("Tags").Replace(tags)
}

func plainTextSeedToHTML(content string) string {
	escaper := strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;")
	paragraphs := strings.Split(content, "\n\n")
	var b strings.Builder
	for _, para := range paragraphs {
		para = strings.TrimSpace(para)
		if para == "" {
			continue
		}
		b.WriteString("<p>")
		b.WriteString(escaper.Replace(para))
		b.WriteString("</p>")
	}
	return b.String()
}

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, " ", "-")
	value = strings.ReplaceAll(value, "/", "-")
	return value
}
