package controllers

import (
	"backend/models"
	"encoding/json"
	"strings"

	"github.com/microcosm-cc/bluemonday"
)

var chapterHTMLPolicy = buildChapterHTMLPolicy()

func buildChapterHTMLPolicy() *bluemonday.Policy {
	p := bluemonday.UGCPolicy()
	p.AllowElements("h2", "h3", "h4", "hr", "s", "u")
	p.AllowAttrs("style").OnElements("span", "p")
	return p
}

// sanitizeChapterHTML strips dangerous markup from author-submitted chapter
// bodies while preserving common rich-text formatting (headings, lists,
// links, emphasis, blockquotes, etc).
func sanitizeChapterHTML(html string) string {
	return chapterHTMLPolicy.Sanitize(html)
}

// plainTextToHTML wraps legacy plain-text chapter content (paragraphs
// separated by a blank line) into `<p>` tags so the frontend always
// receives HTML, whether the chapter was authored via the new editor or
// seeded as plain text.
func plainTextToHTML(content string) string {
	trimmed := strings.TrimSpace(content)
	if trimmed == "" {
		return ""
	}
	if strings.Contains(trimmed, "<p") || strings.Contains(trimmed, "<div") {
		return content
	}
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

func parseStringList(raw string) []string {
	if raw == "" {
		return []string{}
	}
	var list []string
	if err := json.Unmarshal([]byte(raw), &list); err == nil {
		return list
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func encodeStringList(list []string) string {
	if len(list) == 0 {
		return "[]"
	}
	data, _ := json.Marshal(list)
	return string(data)
}

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, " ", "-")
	value = strings.ReplaceAll(value, "_", "-")
	return value
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func publicUserResponse(user models.User) map[string]interface{} {
	color := user.AvatarColor
	if color == "" {
		color = "#957DAD"
	}
	return map[string]interface{}{
		"id":             user.ID,
		"fullName":       user.FullName,
		"username":       user.Username,
		"bio":            user.Bio,
		"avatarColor":    color,
		"avatarUrl":      user.AvatarURL,
		"bannerUrl":      user.BannerURL,
		"favoriteGenres": parseStringList(user.FavoriteGenres),
	}
}

func userProfileResponse(user models.User) map[string]interface{} {
	theme := user.ReaderTheme
	if theme == "" {
		theme = "light"
	}
	fontSize := user.ReaderFontSize
	if fontSize == "" {
		fontSize = "md"
	}
	font := user.ReaderFont
	if font == "" {
		font = "serif"
	}
	avatarColor := user.AvatarColor
	if avatarColor == "" {
		avatarColor = "#957DAD"
	}

	return map[string]interface{}{
		"id":             user.ID,
		"email":          user.Email,
		"fullName":       user.FullName,
		"username":       user.Username,
		"bio":            user.Bio,
		"avatarColor":    avatarColor,
		"avatarUrl":      user.AvatarURL,
		"bannerUrl":      user.BannerURL,
		"provider":       user.Provider,
		"coins":          user.Coins,
		"favoriteGenres": parseStringList(user.FavoriteGenres),
		"blockedTags":    parseStringList(user.BlockedTags),
		"readerTheme":    theme,
		"readerFontSize": fontSize,
		"readerFont":     font,
		"uiScale":        firstNonEmpty(user.UiScale, "md"),
		"siteTheme":      firstNonEmpty(user.SiteTheme, "default"),
		"uiFont":         firstNonEmpty(user.UiFont, "sans"),
		"reduceMotion":   user.ReduceMotion,
		"notifyNewChapters": user.NotifyNewChapters,
		"notifyReplies":     user.NotifyReplies,
		"notifyForum":       user.NotifyForum,
		"notifyTips":        user.NotifyTips,
		"emailDigest":       user.EmailDigest,
	}
}

func tagResponses(tags []models.Tag) []map[string]interface{} {
	out := make([]map[string]interface{}, 0, len(tags))
	for _, tag := range tags {
		out = append(out, map[string]interface{}{
			"id":       tag.ID,
			"name":     tag.Name,
			"slug":     tag.Slug,
			"category": firstNonEmpty(tag.Category, "freeform"),
		})
	}
	return out
}

func coAuthorResponses(users []models.User) []publicAuthor {
	out := make([]publicAuthor, 0, len(users))
	for _, u := range users {
		out = append(out, publicAuthorFrom(u))
	}
	return out
}
