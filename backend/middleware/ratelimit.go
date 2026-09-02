package middleware

import (
	"fmt"
	"net/http"
	"sync"
	"time"
)

type bucket struct {
	times []time.Time
}

var (
	rateMu   sync.Mutex
	rateHits = map[string]*bucket{}
)

func RateLimit(max int, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := r.RemoteAddr
			if user, ok := UserFromContext(r); ok {
				key = fmt.Sprintf("user:%d", user.ID)
			}

			if !allow(key, max, window) {
				http.Error(w, `{"error":"slow down — too many requests"}`, http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func allow(key string, max int, window time.Duration) bool {
	now := time.Now()
	cutoff := now.Add(-window)

	rateMu.Lock()
	defer rateMu.Unlock()

	b, ok := rateHits[key]
	if !ok {
		b = &bucket{}
		rateHits[key] = b
	}

	kept := b.times[:0]
	for _, t := range b.times {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	b.times = kept

	if len(b.times) >= max {
		return false
	}
	b.times = append(b.times, now)
	return true
}
