using System;

using Android.App;
using Android.Content;
using Android.Runtime;
using Android.Views;
using Android.Widget;
using Android.OS;

using Opentok;

using System.Runtime.InteropServices;
using Com.Opentok.Android;

namespace testcsdk_android
{
	[Activity (Label = "testcsdk_android", MainLauncher = true, Icon = "@drawable/icon")]
	public class MainActivity : Activity
	{
		private static string API_KEY = "";
		private static string SESSION_ID = "";
		private static string TOKEN = "";

		private DefaultVideoRenderer publisherView;
		private DefaultVideoRenderer subscriberView;

		private IntPtr sess;
		private IntPtr pub;
		private IntPtr sub;

		private static Session.otc_session_cb sessCb;
		private static Publisher.otc_publisher_cb pubCb;
		private static Subscriber.otc_subscriber_cb subCb;

		private static IntPtr otcapturer;

		protected void DoRenderFrame(DefaultVideoRenderer view, IntPtr frame) 
		{
			var format = Opentok.VideoFrame.otc_video_frame_get_format(frame);
			var copy = Opentok.VideoFrame.otc_video_frame_copy(format, frame);

			view.RenderFrame(copy.ToInt64());
		}

		protected void on_pub_render_frame(IntPtr publisher, IntPtr userdata, IntPtr frame)
		{
			DoRenderFrame (publisherView, frame);
		}

		protected void on_sub_render_frame(IntPtr subscriber, IntPtr sbuser_data, IntPtr frame)
		{
			DoRenderFrame (subscriberView, frame);
		}

		protected void on_connected_cb(IntPtr session, IntPtr userData)
		{
			pubCb = new Publisher.otc_publisher_cb();
			pubCb.on_render_frame = on_pub_render_frame;
			otcapturer = Opentok.Android.VideoCapturer.otc_video_capturer_create();
			pub = Opentok.Publisher.otc_publisher_new("XAMARIN ANDROID", otcapturer, ref pubCb);
			Opentok.Session.otc_session_publish(sess, pub);
		}

		protected void on_stream_received_cb(IntPtr session, IntPtr userData, IntPtr stream)
		{
			subCb = new Subscriber.otc_subscriber_cb();
			subCb.on_render_frame = on_sub_render_frame;
			sub = Opentok.Subscriber.otc_subscriber_new(stream, ref subCb);
			Opentok.Session.otc_session_subscribe(sess, sub);
		}

		protected override void OnCreate (Bundle bundle)
		{
			base.OnCreate (bundle);
			Java.Lang.JavaSystem.LoadLibrary("opentok");

			Opentok.Base.otc_init (this.Handle);

			SetContentView (Resource.Layout.Main);
			publisherView = FindViewById<DefaultVideoRenderer> (Resource.Id.publisherView);
			subscriberView = FindViewById<DefaultVideoRenderer> (Resource.Id.subscriberView);

			sessCb = new Session.otc_session_cb ();
			sessCb.on_connected = on_connected_cb;
			sessCb.on_stream_received = on_stream_received_cb;				
			sess = Opentok.Session.otc_session_new (API_KEY, SESSION_ID, ref sessCb);
			Opentok.Session.otc_session_connect (sess, TOKEN);

			Button	 button = FindViewById<Button> (Resource.Id.myButton);		
			button.Click += delegate {
				Opentok.Android.VideoCapturer.otc_video_capturer_toggle_camera_position(otcapturer);
			};
		}
	}
}