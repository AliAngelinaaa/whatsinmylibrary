package models

type User struct {
	ID             uint   `json:"id" gorm:"primaryKey"`
	Email          string `json:"email" gorm:"uniqueIndex"`
	FullName       string `json:"fullName"`
	Username       string `json:"username" gorm:"uniqueIndex"`
	Bio            string `json:"bio"`
	AvatarColor    string `json:"avatarColor" gorm:"default:#957DAD"`
	AvatarURL      string `json:"avatarUrl"`
	BannerURL      string `json:"bannerUrl"`
	Provider       string `json:"provider"`
	Coins          int    `json:"coins" gorm:"default:0"`
	FavoriteGenres string `json:"-"`
	BlockedTags    string `json:"-"`
	ReaderTheme    string `json:"readerTheme" gorm:"default:light"`
	ReaderFontSize string `json:"readerFontSize" gorm:"default:md"`
	ReaderFont     string `json:"readerFont" gorm:"default:serif"`
	UiScale        string `json:"uiScale" gorm:"default:md"`
	SiteTheme      string `json:"siteTheme" gorm:"default:default"`
	UiFont         string `json:"uiFont" gorm:"default:sans"`
	ReduceMotion   bool   `json:"reduceMotion" gorm:"default:false"`
	// Notification preferences (stored as bool columns; no actual email/push yet)
	NotifyNewChapters bool `json:"notifyNewChapters" gorm:"default:true"`
	NotifyReplies     bool `json:"notifyReplies" gorm:"default:true"`
	NotifyForum       bool `json:"notifyForum" gorm:"default:true"`
	NotifyTips        bool `json:"notifyTips" gorm:"default:true"`
	EmailDigest       bool `json:"emailDigest" gorm:"default:false"`
}
