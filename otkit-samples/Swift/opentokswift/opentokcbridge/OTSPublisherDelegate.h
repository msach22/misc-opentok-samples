//
//  OTSPublisherDelegate.h
//  opentok
//
//  Created by rpc on 16/02/15.
//  Copyright (c) 2015 tokbox. All rights reserved.
//

#import <Foundation/Foundation.h>
struct otc_video_frame;
struct otc_publisher_cb;

typedef void (^renderFrameBlock)(otc_video_frame *frame);

@interface OTSPublisherDelegate : NSObject

@property (nonatomic, strong) renderFrameBlock renderFrame;

- (otc_publisher_cb *)cCallbackWrapper;

@end
