# pstv_web2

pstv_web2 is based on Next.js, it provides web front-end and backend api.

## Ground work - [0-basic-boilerplate](https://github.com/mingster/pstv_web2/tree/0-basic-boilerplate)

- Globalization ([i18n](https://next.i18next.com)
- Themes ([NextTheme](https://github.com/pacocoursey/next-themes#readme))
- Database backend ([PostgresSQL](https://www.postgresql.org) & [MongoDB](https://www.mongodb.com))
- Authentication ([NextAuth](https://next-auth.js.org)
- [Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- Video ([React player](https://github.com/cookpete/react-player))
- Rich text editor / cms
- [QR code](https://github.com/Bunlong/next-qrcode)

- Store front / Store Admin / Backend Admin / User account/profiles
- Cart
- payment plug-in pattern 
	- (stripe)
- shipping plug-in pattern
- ui
	- data grid/ data table
	- charting
	- modal
	- infinite scroll
	- dynamic background

## Biz Logic

### HomePage

home page is shown before sign-in. After signed, it shows connected page:

- Connected / PlayingNow page

show active channels with program currently shown. The info is reloaded every 10 min.

### Player

allow subscribers to receive live streaming.


### EPG

### Support

### Help

### Shop

### User Account

### registration

### Free trial

disallow certain countries to get the free trial.
When disallow, show shopping page instead.

## Sign-in

## Sign-out

## My Account

## Affiliates

allow users in affiliate group and in pstv_affiliateCustomer table to enter.

## Dashboard

## Customer Management

## TvCard management

## TvCard purchasing

## Order History

## iPhone

<code>xxxiPhone.Master</code> is used for iPhone visits.

## iPad

<code>xxxiPad.Master</code> is used for iPhone visits.

## Android

<code>/android/activation</code> provides device linking for Android phone.

<code>/tvlink</code> provides device linking for AndroidTV.

## ROKU

<code>/roku</code> provides device linking for ROKU.

## WebAPI / Admin

## Automated utilities

<code>/adm/affiliates/AutoOrder.ashx</code> 