
using System;
using System.Drawing;

using Foundation;
using UIKit;
using ObjCRuntime;

using Opentok;

using System.Runtime.InteropServices;

namespace testcsdk
{
	public class MainViewController : UIViewController
	{
		static string API_KEY = "<API_KEY>";
		static string SESSION_ID = "<SESSION_ID>";
		static string TOKEN = "<TOKEN>";

		public OTGLVideoRender publisher { get; set; }
		public OTGLVideoRender subscriber {get; set;}

		public UIButton toggleButton { get; set; }

		static IntPtr sess;
		static IntPtr pub;
		static IntPtr sub;

		static IntPtr capturer;

		static Session.otc_session_cb sessCb;
		static Publisher.otc_publisher_cb pubCb;
		static Subscriber.otc_subscriber_cb subCb;

		public MainViewController () : base ()
		{
		}

		public void DoRenderFrame(OTGLVideoRender view, IntPtr frame)
		{
			var format = Opentok.VideoFrame.otc_video_frame_get_format (frame);
			var copy = Opentok.VideoFrame.otc_video_frame_copy (format, frame);

			view.RenderVideoFrame (copy);
			Opentok.VideoFrame.otc_video_frame_destroy (copy);
		}
			
		[MonoPInvokeCallback (typeof (Opentok.Publisher.on_render_frame_delegate))]
		static void on_pub_render_frame(IntPtr publisher, IntPtr userdata, IntPtr frame)
		{
			GCHandle handle = (GCHandle)userdata;
			MainViewController v = (handle.Target as MainViewController);
			v.DoRenderFrame (v.publisher, frame);
		}

		[MonoPInvokeCallback (typeof (Opentok.Subscriber.on_render_frame_delegate))]
		static void on_sub_render_frame(IntPtr publisher, IntPtr userdata, IntPtr frame)
		{
			GCHandle handle = (GCHandle)userdata;
			MainViewController v = (handle.Target as MainViewController);
			v.DoRenderFrame (v.subscriber, frame);
		}

		[MonoPInvokeCallback (typeof (Opentok.Session.on_connected_delegate))]
		static void on_connected_cb(IntPtr session, IntPtr userData) {
			pubCb = new Opentok.Publisher.otc_publisher_cb();
			pubCb.userData = userData;
			pubCb.on_render_frame = on_pub_render_frame;
			capturer = Opentok.iOS.VideoCapturer.video_capturer_create (640, 480);
			pub = Opentok.Publisher.otc_publisher_new ("C SDK XAMRARIN", capturer, ref pubCb);
			Opentok.Session.otc_session_publish (session, pub);
		}

		[MonoPInvokeCallback (typeof (Opentok.Session.on_stream_received_delegate))]
		static void on_stream_received_cb(IntPtr session, IntPtr userData, IntPtr stream) {
			subCb = new Opentok.Subscriber.otc_subscriber_cb();
			subCb.userData = userData;
			subCb.on_render_frame = on_sub_render_frame;
			sub = Opentok.Subscriber.otc_subscriber_new (stream, ref subCb);
			Opentok.Session.otc_session_subscribe (session, sub);
		}

		public override void ViewDidLoad ()
		{
			base.ViewDidLoad ();

			Opentok.Base.otc_init ();

			publisher = new OTGLVideoRender(new RectangleF(0, 0, 320, 240));
			subscriber = new OTGLVideoRender(new RectangleF(0, 240, 320, 240));

			sessCb = new Session.otc_session_cb();
			sessCb.on_connected = on_connected_cb;
			sessCb.on_stream_received = on_stream_received_cb;
			sessCb.userData = (IntPtr) GCHandle.Alloc(this);

			sess = Opentok.Session.otc_session_new(API_KEY, SESSION_ID, ref sessCb);
			Opentok.Session.otc_session_connect(sess,TOKEN);

			publisher.BackgroundColor = UIColor.Red;
			subscriber.BackgroundColor = UIColor.Yellow;		

			View.AddSubview (publisher);
			View.AddSubview (subscriber);

			toggleButton = new UIButton (new RectangleF (0, 480, 320, 100));
			toggleButton.SetTitle ("Toggle Camera", UIControlState.Normal);
			toggleButton.TouchUpInside += 
				(object sender, EventArgs e) => 
					Opentok.iOS.VideoCapturer.video_capturer_toggle_camera_position (capturer);

			View.AddSubview (toggleButton);
		}
	}
}

